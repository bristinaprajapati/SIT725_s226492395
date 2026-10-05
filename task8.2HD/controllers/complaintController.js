const Complaint = require('../models/Complaint');


// ----------------------------------------------------
// POST - Submit a new complaint
// ----------------------------------------------------

exports.createComplaint = async (req, res, next) => {

  try {

    const {
      studentId,
      studentName,
      description
    } = req.body;


    // ------------------------------------------------
    // Validate Student ID
    // ------------------------------------------------

    if (
      !studentId ||
      studentId.trim() === ''
    ) {

      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });

    }


    // ------------------------------------------------
    // Validate Student Name
    // ------------------------------------------------

    if (
      !studentName ||
      studentName.trim() === ''
    ) {

      return res.status(400).json({
        success: false,
        message: 'Student name is required'
      });

    }


    // ------------------------------------------------
    // Validate Complaint Description
    // ------------------------------------------------

    if (
      !description ||
      description.trim() === ''
    ) {

      return res.status(400).json({
        success: false,
        message: 'Complaint description is required'
      });

    }


    if (
      description.trim().length < 5
    ) {

      return res.status(400).json({
        success: false,
        message:
          'Complaint must contain at least 5 characters'
      });

    }


    if (
      description.trim().length > 500
    ) {

      return res.status(400).json({
        success: false,
        message:
          'Complaint cannot exceed 500 characters'
      });

    }


    // ------------------------------------------------
    // Create Complaint
    // ------------------------------------------------

    const complaint =
      new Complaint({

        studentId:
          studentId.trim(),

        studentName:
          studentName.trim(),

        description:
          description.trim(),

        status:
          'Pending'

      });


    const savedComplaint =
      await complaint.save();


    // ------------------------------------------------
    // Success Response
    // ------------------------------------------------

    return res.status(201).json({

      success: true,

      message:
        'Complaint submitted successfully',

      data:
        savedComplaint

    });

  }

  catch (error) {

    next(error);

  }

};



// ----------------------------------------------------
// GET - Get all complaints
// ----------------------------------------------------

exports.getAllComplaints = async (
  req,
  res,
  next
) => {

  try {

    const complaints =
      await Complaint
        .find()
        .sort({
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      count:
        complaints.length,

      data:
        complaints

    });

  }

  catch (error) {

    next(error);

  }

};



// ----------------------------------------------------
// GET - Get complaints belonging to one student
// ----------------------------------------------------

exports.getStudentComplaints = async (
  req,
  res,
  next
) => {

  try {

    const {
      studentId
    } = req.params;


    // ------------------------------------------------
    // Validate Student ID
    // ------------------------------------------------

    if (
      !studentId ||
      studentId.trim() === ''
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Student ID is required'

      });

    }


    // ------------------------------------------------
    // Find Student Complaints
    // ------------------------------------------------

    const complaints =
      await Complaint
        .find({
          studentId:
            studentId.trim()
        })
        .sort({
          createdAt: -1
        });


    return res.status(200).json({

      success: true,

      count:
        complaints.length,

      data:
        complaints

    });

  }

  catch (error) {

    next(error);

  }

};



// ----------------------------------------------------
// GET - Get a single complaint by ID
// ----------------------------------------------------

exports.getComplaintById = async (
  req,
  res,
  next
) => {

  try {

    const complaint =
      await Complaint.findById(
        req.params.id
      );


    // ------------------------------------------------
    // Complaint Not Found
    // ------------------------------------------------

    if (!complaint) {

      return res.status(404).json({

        success: false,

        message:
          'Complaint not found'

      });

    }


    return res.status(200).json({

      success: true,

      data:
        complaint

    });

  }

  catch (error) {


    // ------------------------------------------------
    // Invalid MongoDB ID
    // ------------------------------------------------

    if (
      error.name === 'CastError'
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Invalid complaint ID'

      });

    }


    next(error);

  }

};



// ----------------------------------------------------
// PATCH - Update complaint status
// ----------------------------------------------------

exports.updateComplaintStatus = async (
  req,
  res,
  next
) => {

  try {

    const {
      status
    } = req.body;


    const allowedStatuses = [

      'Pending',

      'In Progress',

      'Resolved'

    ];


    // ------------------------------------------------
    // Status Required
    // ------------------------------------------------

    if (
      !status ||
      status.trim() === ''
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Complaint status is required'

      });

    }


    // ------------------------------------------------
    // Validate Status
    // ------------------------------------------------

    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Status must be Pending, In Progress, or Resolved'

      });

    }


    // ------------------------------------------------
    // Find Complaint and Update Status
    // ------------------------------------------------

    const updatedComplaint =
      await Complaint.findByIdAndUpdate(

        req.params.id,

        {
          status:
            status
        },

        {
          new: true,
          runValidators: true
        }

      );


    // ------------------------------------------------
    // Complaint Not Found
    // ------------------------------------------------

    if (!updatedComplaint) {

      return res.status(404).json({

        success: false,

        message:
          'Complaint not found'

      });

    }


    // ------------------------------------------------
    // Success
    // ------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        'Complaint status updated successfully',

      data:
        updatedComplaint

    });

  }

  catch (error) {


    // ------------------------------------------------
    // Invalid MongoDB ID
    // ------------------------------------------------

    if (
      error.name === 'CastError'
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Invalid complaint ID'

      });

    }


    next(error);

  }

};