const Student = require('./student.model');
const mongoose = require('mongoose');

module.exports = class StudentController {
    async getStudents(req, res) {
        try {
            const students = await Student.find();
            return { data: students, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async getStudentById(req, res) {
        try {
            const student = await Student.findById(req.params.id);
            if (!student) {
                return { errormsg: 'Student not found', statusCode: 404, error: true };
            }
            return { data: student, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async createStudent(req, res) {
        const student = new Student({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            schoolId: req.user.school_id,
            classroomId: req.body.classroomId,
        });

        try {
            const newStudent = await student.save();
            return { data: newStudent, statusCode: 201, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async updateStudent(req, res) {
        try {
            const updatedStudent = await Student.findByIdAndUpdate(
                req.params.id,
                { firstName: req.body.firstName, lastName: req.body.lastName },
                { new: true }
            );
            if (!updatedStudent) {
                return { errormsg: 'Student not found', statusCode: 404, error: true };
            }
            return { data: updatedStudent, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async deleteStudent(req, res) {
        try {
            const deletedStudent = await Student.findByIdAndDelete(req.params.id);
            if (!deletedStudent) {
                return { errormsg: 'Student not found', statusCode: 404, error: true };
            }
            return { message: 'Student deleted successfully', statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { errormsg: 'Internal server error', statusCode: 500, error: true };
        }
    }
};
