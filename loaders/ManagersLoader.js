const MiddlewaresLoader     = require('./MiddlewaresLoader');
const ApiHandler            = require("../managers/api/Api.manager");
const LiveDB                = require('../managers/live_db/LiveDb.manager');
const UserServer            = require('../managers/http/UserServer.manager');
const ResponseDispatcher    = require('../managers/response_dispatcher/ResponseDispatcher.manager');
const VirtualStack          = require('../managers/virtual_stack/VirtualStack.manager');
const ValidatorsLoader      = require('./ValidatorsLoader');
const ResourceMeshLoader    = require('./ResourceMeshLoader');
const utils                 = require('../libs/utils');

const systemArch            = require('../static_arch/main.system');
const TokenManager          = require('../managers/token/Token.manager');
const SharkFin              = require('../managers/shark_fin/SharkFin.manager');
const TimeMachine           = require('../managers/time_machine/TimeMachine.manager');
const Classroom             = require('../managers/models/classrooms/classroom.model');
const School                = require('../managers/models/schools/school.model');
const Student               = require('../managers/models/students/student.model');


/** 
 * load sharable modules
 * @return modules tree with instance of each module
*/
module.exports = class ManagersLoader {
    constructor({ config, cortex, cache, oyster, aeon }) {

        this.managers   = {};
        this.config     = config;
        this.cache      = cache;
        this.cortex     = cortex;
        
        this._preload();
        this.injectable = {
            utils,
            cache, 
            config,
            cortex,
            oyster,
            aeon,
            managers: this.managers, 
            validators: this.validators,
            // mongomodels: this.mongomodels,
            resourceNodes: this.resourceNodes,
            Classroom,
            School,
            Student
        };
        
    }

    _preload(){
        const validatorsLoader    = new ValidatorsLoader({
            models: require('../managers/_common/schema.models'),
            customValidators: require('../managers/_common/schema.validators'),
        });
        const resourceMeshLoader  = new ResourceMeshLoader({})
        // const mongoLoader      = new MongoLoader({ schemaExtension: "mongoModel.js" });

        this.validators           = validatorsLoader.load();
        this.resourceNodes        = resourceMeshLoader.load();
        // this.mongomodels          = mongoLoader.load();
    }

    load() {
        this.managers.responseDispatcher  = new ResponseDispatcher();
        this.managers.liveDb              = new LiveDB(this.injectable);
        const middlewaresLoader           = new MiddlewaresLoader(this.injectable);
        const mwsRepo                     = middlewaresLoader.load();
        const { layers, actions }         = systemArch;
        this.injectable.mwsRepo           = mwsRepo;
        /*****************************************CUSTOM MANAGERS*****************************************/
        this.managers.shark               = new SharkFin({ ...this.injectable, layers, actions });
        this.managers.timeMachine         = new TimeMachine(this.injectable);
        this.managers.token               = new TokenManager(this.injectable);
        /*************************************************************************************************/
        this.managers.mwsExec             = new VirtualStack({ ...{ preStack: [/* '__token', */'__device',] }, ...this.injectable });
        this.managers.userApi             = new ApiHandler({...this.injectable,...{prop:'httpExposed'}});
        this.managers.userServer          = new UserServer({ config: this.config, managers: this.managers });
        this.managers.userApi.methodMatrix['user'] = this.managers.userApi.methodMatrix['user'] || {};
        this.managers.userApi.methodMatrix['user']['post'] = this.managers.userApi.methodMatrix['user']['post'] || [];
        this.managers.userApi.methodMatrix['user']['post'].push('login');
        this.managers.userApi.methodMatrix['user']['post'].push('register');
        this.managers.userApi.methodMatrix['user']['get'].push('getUserById');
        this.managers.userApi.methodMatrix['user']['get'].push('getUser');
        this.managers.userApi.methodMatrix['user']['put'].push('updateUser');
        this.managers.userApi.methodMatrix['user']['delete'].push('deteteUser');

        this.managers.userApi.methodMatrix['school'] = this.managers.userApi.methodMatrix['school'] || {};
        this.managers.userApi.methodMatrix['school']['post'] = this.managers.userApi.methodMatrix['school']['post'] || [];
        this.managers.userApi.methodMatrix['school']['post'].push('createSchool');
        this.managers.userApi.methodMatrix['school']['get'].push('getSchoolById');
        this.managers.userApi.methodMatrix['school']['get'].push('getSchools');
        this.managers.userApi.methodMatrix['school']['put'].push('updateSchool');
        this.managers.userApi.methodMatrix['school']['delete'].push('deteteSchool');
        
        this.managers.userApi.methodMatrix['classroom'] = this.managers.userApi.methodMatrix['classroom'] || {};
        this.managers.userApi.methodMatrix['classroom']['post'] = this.managers.userApi.methodMatrix['classroom']['post'] || [];
        this.managers.userApi.methodMatrix['classroom']['post'].push('createClassroom');
        this.managers.userApi.methodMatrix['classroom']['get'].push('getClassroomById');
        this.managers.userApi.methodMatrix['classroom']['get'].push('getClassrooms');
        this.managers.userApi.methodMatrix['classroom']['put'].push('updateClassroom');
        this.managers.userApi.methodMatrix['classroom']['delete'].push('deteteClassroom');

        this.managers.userApi.methodMatrix['student'] = this.managers.userApi.methodMatrix['student'] || {};
        this.managers.userApi.methodMatrix['student']['post'] = this.managers.userApi.methodMatrix['student']['post'] || [];
        this.managers.userApi.methodMatrix['student']['post'].push('createStudent');
        this.managers.userApi.methodMatrix['student']['get'].push('getStudentById');
        this.managers.userApi.methodMatrix['student']['get'].push('getStudents');
        this.managers.userApi.methodMatrix['student']['put'].push('updateStudent');
        this.managers.userApi.methodMatrix['student']['delete'].push('deteteStudent');
        

       
        return this.managers;

    }

}

