const getParamNames = require('./_common/getParamNames')
const ClassroomController = require('../../managers/models/classrooms/classroom.controller')
const StudentController = require('../../managers/models/students/student.controller')
const SchoolController = require('../../managers/models/schools/school.controller')
const UserController = require('../models/users/user.controller')
/**
 * scans all managers for exposed methods
 * and makes them available through a handler middleware
 */

module.exports = class ApiHandler {
  /**
   * @param {object} containing instance of all managers
   * @param {string} prop with key to scan for exposed methods
   */

  constructor({ config, cortex, cache, managers, mwsRepo, prop }) {
    this.config = config
    this.cache = cache
    this.cortex = cortex
    this.managers = managers
    this.mwsRepo = mwsRepo
    this.mwsExec = this.managers.mwsExec
    this.prop = prop
    this.exposed = {}
    this.methodMatrix = {}
    this.auth = {}
    this.fileUpload = {}
    this.mwsStack = {}
    this.mw = this.mw.bind(this)

    /** filter only the modules that have interceptors */
    // console.log(`# Http API`);
    Object.keys(this.managers).forEach((mk) => {
      if (this.managers[mk][this.prop]) {
        // console.log('managers - mk ', this.managers[mk])
        this.methodMatrix[mk] = {}
        // console.log(`## ${mk}`);
        this.managers[mk][this.prop].forEach((i) => {
          /** creating the method matrix */
          let method = 'post'
          let fnName = i
          if (i.includes('=')) {
            let frags = i.split('=')
            method = frags[0]
            fnName = frags[1]
          }
          if (!this.methodMatrix[mk][method]) {
            this.methodMatrix[mk][method] = []
          }
          this.methodMatrix[mk][method].push(fnName)

          let params = getParamNames(this.managers[mk][fnName], fnName, mk)
          params = params.split(',').map((i) => {
            i = i.trim()
            i = i.replace('{', '')
            i = i.replace('}', '')
            return i
          })
          /** building middlewares stack */

          params.forEach((param) => {
            if (!this.mwsStack[`${mk}.${fnName}`]) {
              this.mwsStack[`${mk}.${fnName}`] = []
            }
            if (param.startsWith('__')) {
              // this is a middleware identifier
              // mws are executed in the same order they existed
              /** check if middleware exists */
              // console.log(this.mwsRepo);
              if (!this.mwsRepo[param]) {
                throw Error(`Unable to find middleware ${param}`)
              } else {
                this.mwsStack[`${mk}.${fnName}`].push(param)
              }
            }
          })

          // console.log(`* ${i} :`, 'args=', params);
        })
      }
    })

    /** expose apis through cortex */
    Object.keys(this.managers).forEach((mk) => {
      if (this.managers[mk].interceptor) {
        this.exposed[mk] = this.managers[mk]
        // console.log(`## ${mk}`);
        if (this.exposed[mk].cortexExposed) {
          this.exposed[mk].cortexExposed.forEach((i) => {
            // console.log(`* ${i} :`,getParamNames(this.exposed[mk][i]));
          })
        }
      }
    })

    /** expose apis through cortex */
    this.cortex.sub('*', (d, meta, cb) => {
      let [moduleName, fnName] = meta.event.split('.')
      let targetModule = this.exposed[moduleName]
      if (!targetModule) return cb({ error: `module ${moduleName} not found` })
      try {
        targetModule.interceptor({ data: d, meta, cb, fnName })
      } catch (err) {
        cb({ error: `failed to execute ${fnName}` })
      }
    })


    // user
    this.methodMatrix['user'] = this.methodMatrix['user'] || []
    this.methodMatrix['user']['post'] = this.methodMatrix['user']['post'] || []
    this.methodMatrix['user']['get'] = this.methodMatrix['user']['get'] || []
    this.methodMatrix['user']['delete'] = this.methodMatrix['user']['delete'] || []
    this.methodMatrix['user']['put'] = this.methodMatrix['user']['put'] || []

    this.methodMatrix['user']['post'].push('login')
    this.methodMatrix['user']['post'].push('register')
    this.methodMatrix['user']['get'].push('getByUserId')
    this.methodMatrix['user']['get'].push('getuser')
    this.methodMatrix['user']['delete'].push('deleteUser')
    this.methodMatrix['user']['put'].push('updateUser')

    // schools
    this.methodMatrix['school'] = this.methodMatrix['school'] || {}
    this.methodMatrix['school']['post'] = this.methodMatrix['school']['post'] || []
    this.methodMatrix['school']['get'] = this.methodMatrix['school']['get'] || []
    this.methodMatrix['school']['delete'] = this.methodMatrix['school']['delete'] || []
    this.methodMatrix['school']['put'] = this.methodMatrix['school']['put'] || []

    this.methodMatrix['school']['post'].push('createSchool')
    this.methodMatrix['school']['get'].push('getSchoolById')
    this.methodMatrix['school']['get'].push('getSchools')
    this.methodMatrix['school']['delete'].push('deleteSchool')
    this.methodMatrix['school']['put'].push('updateSchool')

    // classrooms
    this.methodMatrix['classroom'] = this.methodMatrix['classroom'] || {}
    this.methodMatrix['classroom']['post'] = this.methodMatrix['classroom']['post'] || []
    this.methodMatrix['classroom']['get'] = this.methodMatrix['classroom']['get'] || []
    this.methodMatrix['classroom']['delete'] = this.methodMatrix['classroom']['delete'] || []
    this.methodMatrix['classroom']['put'] = this.methodMatrix['classroom']['put'] || []

    this.methodMatrix['classroom']['post'].push('createClassroom')
    this.methodMatrix['classroom']['get'].push('getClassroomsById')
    this.methodMatrix['classroom']['get'].push('getClassrooms')
    this.methodMatrix['classroom']['delete'].push('deleteClassroom')
    this.methodMatrix['classroom']['put'].push('updateClassroom')

    // students

    this.methodMatrix['student'] = this.methodMatrix['student'] || {}
    this.methodMatrix['student']['post'] = this.methodMatrix['student']['post'] || []
    this.methodMatrix['student']['get'] = this.methodMatrix['student']['get'] || []
    this.methodMatrix['student']['delete'] = this.methodMatrix['student']['delete'] || []
    this.methodMatrix['student']['put'] = this.methodMatrix['student']['put'] || []

    this.methodMatrix['student']['post'].push('createClassroom')
    this.methodMatrix['student']['get'].push('getClassroomsById')
    this.methodMatrix['student']['get'].push('getClassrooms')
    this.methodMatrix['student']['delete'].push('deleteClassroom')
    this.methodMatrix['student']['put'].push('updateClassroom')

    this.userController = new UserController({ config })
    this.schoolController = new SchoolController()
    this.classroomController = new ClassroomController()
    this.studentController = new StudentController()
  }

  async _exec({ targetModule, fnName, cb, data }) {
    let result = {}

    try {
      result = await targetModule[`${fnName}`](data)
    } catch (err) {
      console.log(`error`, err)
      result.error = `${fnName} failed to execute`
    }

    if (cb) cb(result)
    return result
  }

  /** a middle for executing admin apis trough HTTP */
  async mw(req, res, next) {
    let method = req.method.toLowerCase()
    let moduleName = req.params.moduleName
    let context = req.params.context
    let fnName = req.params.fnName
    let moduleMatrix = this.methodMatrix[moduleName]

    // user
    if (moduleName == 'user' && fnName == 'register') {
      let result = await this.userController.register(req, res)
      if (result.error) {
        return res.status(result.statusCode).json(result)
      } else {
        return res.status(200).json(result)
      }
    }

    if (moduleName == 'user' && fnName == 'login') {
      console.log("In the API manager");
      let result = await this.userController.login(req, res);
      console.log(result);
      if (result.error) {
        return res.status(result.statusCode).json(result)
      } else {
        return res.status(200).json(result)
      }
    }

    if (moduleName == 'user' && fnName == 'getUserById') {
      let result = await this.userController.getUserById(req, res)
      if (result.error) {
        return res.status(result.statusCode).json(result)
      } else {
        return res.status(200).json(result)
      }
    }

    if (moduleName == 'user' && fnName == 'getUser') {
      let result = await this.userController.getUser(req, res)
      if (result.error) {
        return res.status(result.statusCode).json(result)
      } else {
        return res.status(200).json(result)
      }
    }

    if (moduleName == 'user' && fnName == 'deleteUser') {
        let result = await this.userController.deleteUser(req, res)
        if (result.error) {
          return res.status(result.statusCode).json(result)
        } else {
          return res.status(200).json(result)
        }
    }

    if (moduleName == 'user' && fnName == 'updateUser') {
        let result = await this.userController.updateUser(req, res)
        if (result.error) {
          return res.status(result.statusCode).json(result)
        } else {
          return res.status(200).json(result)
        }
    }

    // Schools

    if (moduleName == 'school' && fnName == 'createSchool') {
        let result = await this.schoolController.createSchool(req, res)
        if (result.error) {
          return res.status(result.statusCode).json(result)
        } else {
          return res.status(201).json(result)
        }
    }
  
    if (moduleName == 'school' && fnName == 'getSchoolById') {
    let result = await this.schoolController.getSchoolById(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'school' && fnName == 'getSchools') {
    let result = await this.schoolController.getSchools(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'school' && fnName == 'deleteSchool') {
        let result = await this.schoolController.deleteSchool(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

    if (moduleName == 'school' && fnName == 'updateSchool') {
        let result = await this.schoolController.updateSchool(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

    // classrooms

    if (moduleName == 'classroom' && fnName == 'createClassroom') {
        let result = await this.classroomController.createClassroom(req, res)
        if (result.error) {
          return res.status(result.statusCode).json(result)
        } else {
          return res.status(200).json(result)
        }
    }
  
    if (moduleName == 'classroom' && fnName == 'getClassroomById') {
    let result = await this.classroomController.getClassroomById(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'classroom' && fnName == 'getClassrooms') {
    let result = await this.classroomController.getClassrooms(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'classroom' && fnName == 'deleteClassroom') {
        let result = await this.classroomController.deleteClassroom(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

    if (moduleName == 'classroom' && fnName == 'updateClassroom') {
        let result = await this.classroomController.updateClassroom(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

    // studets

    if (moduleName == 'student' && fnName == 'createStudent') {
        let result = await this.studentController.createStudent(req, res)
        if (result.error) {
          return res.status(result.statusCode).json(result)
        } else {
          return res.status(200).json(result)
        }
    }
  
    if (moduleName == 'student' && fnName == 'getStudentById') {
    let result = await this.studentController.getStudentById(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'student' && fnName == 'getStudents') {
    let result = await this.studentController.getStudents(req, res)
    if (result.error) {
        return res.status(result.statusCode).json(result)
    } else {
        return res.status(200).json(result)
    }
    }

    if (moduleName == 'student' && fnName == 'deleteStudent') {
        let result = await this.studentController.deleteStudent(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

    if (moduleName == 'student' && fnName == 'updateStudent') {
        let result = await this.studentController.updateStudent(req, res)
        if (result.error) {
        return res.status(result.statusCode).json(result)
        } else {
        return res.status(200).json(result)
        }
    }

      
    /** validate module */
    if (!moduleMatrix) return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `module ${moduleName} not found` })

    /** validate method */
    if (!moduleMatrix[method]) {
      return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `unsupported method ${method} for ${moduleName}` })
    }

    if (!moduleMatrix[method].includes(fnName)) {
      return this.managers.responseDispatcher.dispatch(res, { ok: false, message: `unable to find function ${fnName} with method ${method}` })
    }

    // console.log(`${moduleName}.${fnName}`);

    let targetStack = this.mwsStack[`${moduleName}.${fnName}`]

    let hotBolt = this.mwsExec.createBolt({
      stack: targetStack,
      req,
      res,
      onDone: async ({ req, res, results }) => {
        /** executed after all middleware finished */

        let body = req.body || {}
        let result = await this._exec({
          targetModule: this.managers[moduleName],
          fnName,
          data: {
            ...body,
            ...results,
            res,
          },
        })
        if (!result) result = {}

        if (result.selfHandleResponse) {
          // do nothing if response handeled
        } else {
          if (result.errors) {
            return this.managers.responseDispatcher.dispatch(res, { ok: false, errors: result.errors })
          } else if (result.error) {
            return this.managers.responseDispatcher.dispatch(res, { ok: false, message: result.error })
          } else {
            return this.managers.responseDispatcher.dispatch(res, { ok: true, data: result })
          }
        }
      },
    })
    hotBolt.run()
  }
}
