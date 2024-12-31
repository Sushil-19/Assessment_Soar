const Classroom = require('./classroom.model');

module.exports = class ClassroomController {
    async getClassrooms(req, res) {
        try {
            // Populate school reference
            const classrooms = await Classroom.find().populate('schoolId');
            return { data: classrooms, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async getClassroomById(req, res) {
        try {
            // Populate school reference
            const classroom = await Classroom.findById(req.params.id).populate('schoolId');
            if (!classroom) {
                return { message: 'Classroom not found', statusCode: 404, error: true };
            }
            return { data: classroom, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async createClassroom(req, res) {
        const { name, capacity, resources, isSmartClassroom } = req.body;
        console.log(req.user.school_id);
        const classroom = new Classroom({
            name,
            capacity,
            schoolId: req.user.school_id,
            resources: resources || [], 
            isSmartClassroom: isSmartClassroom || false,
        });
        

        try {
            const newClassroom = await classroom.save();
            return { data: newClassroom, statusCode: 201, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async updateClassroom(req, res) {
        const { name, capacity, resources, isSmartClassroom } = req.body;

        try {
            const updatedClassroom = await Classroom.findByIdAndUpdate(
                req.params.id,
                { name, capacity, schoolId: req.user.school_id, resources, isSmartClassroom },
                { new: true }
            ).populate('schoolId'); 

            if (!updatedClassroom) {
                return { message: 'Classroom not found', statusCode: 404, error: true };
            }
            return { data: updatedClassroom, statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }

    async deleteClassroom(req, res) {
        try {
            const deletedClassroom = await Classroom.findByIdAndDelete(req.params.id);
            if (!deletedClassroom) {
                return { message: 'Classroom not found', statusCode: 404, error: true };
            }
            return { message: 'Classroom deleted successfully', statusCode: 200, error: false };
        } catch (error) {
            console.error(error);
            return { message: 'Internal server error', statusCode: 500, error: true };
        }
    }
};
