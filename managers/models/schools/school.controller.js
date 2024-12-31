const mongoose = require('mongoose');
const School = require('./school.model');

module.exports = class SchoolController {
    async getSchools(req, res) {
        try {
            const schools = await School.find();
            return { data: schools, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async getSchoolById(req, res) {
        try {
            const school = await School.findById(req.params.id);
            if (!school) {
                return { message: 'School not found', statusCode: 404, error: true };
            }
            return { data: school, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async createSchool(req, res) {
        console.log('Request body:', req.body);
        const { name, address, principal, contactNumber, numberOfStudents, establishedYear } = req.body;

        const school = new School({
            name,
            address,
            principal,
            contactNumber,
            numberOfStudents,
            establishedYear,
        });

        try {
            const newSchool = await school.save();
            return { data: newSchool, statusCode: 201, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async updateSchool(req, res) {
        try {
            const updatedSchool = await School.findByIdAndUpdate(
                req.params.id,
                {
                    name: req.body.name,
                    address: req.body.address,
                    principal: req.body.principal,
                    contactNumber: req.body.contactNumber,
                    numberOfStudents: req.body.numberOfStudents,
                    establishedYear: req.body.establishedYear,
                },
                { new: true }
            );
            if (!updatedSchool) {
                return { message: 'School not found', statusCode: 404, error: true };
            }
            return { data: updatedSchool, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async deleteSchool(req, res) {
        try {
            const deletedSchool = await School.findByIdAndDelete(req.params.id);
            if (!deletedSchool) {
                return { message: 'School not found', statusCode: 404, error: true };
            }
            return { message: 'School deleted successfully', statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }
};
