// ----------------------------------------------------
// Complaint Module Automated Tests
// Clive - Sprint 2
// ----------------------------------------------------

jest.mock('../models/Complaint', () => {

  const MockComplaint = jest.fn();

  MockComplaint.find =
    jest.fn();

  MockComplaint.findById =
    jest.fn();

  MockComplaint.findByIdAndUpdate =
    jest.fn();

  return MockComplaint;

});


const request =
  require('supertest');

const app =
  require('./complaintTestApp');

const Complaint =
  require('../models/Complaint');



// ----------------------------------------------------
// SAMPLE COMPLAINT
// ----------------------------------------------------

const sampleComplaint = {

  _id:
    '652f1f1f1f1f1f1f1f1f1f1f',

  studentId:
    's22556211',

  studentName:
    'Clive Correya',

  description:
    'The light in my room is not working properly.',

  status:
    'Pending',

  createdAt:
    '2026-09-22T00:00:00.000Z'

};



// ----------------------------------------------------
// CLEAR MOCKS AFTER EACH TEST
// ----------------------------------------------------

afterEach(() => {

  jest.clearAllMocks();

});



// ====================================================
// POST /api/complaints
// ====================================================

describe(
  'POST /api/complaints',
  () => {


    test(
      'creates a complaint when valid information is provided',
      async () => {

        const saveMock =
          jest
            .fn()
            .mockResolvedValue(
              sampleComplaint
            );


        Complaint.mockImplementation(
          (data) => {

            return {

              ...data,

              status:
                'Pending',

              save:
                saveMock

            };

          }
        );


        const response =
          await request(app)

            .post(
              '/api/complaints'
            )

            .send({

              studentId:
                's22556211',

              studentName:
                'Clive Correya',

              description:
                'The light in my room is not working properly.'

            });


        expect(
          response.status
        ).toBe(201);


        expect(
          response.body.success
        ).toBe(true);


        expect(
          response.body.message
        ).toBe(
          'Complaint submitted successfully'
        );


        expect(
          Complaint
        ).toHaveBeenCalledWith(

          expect.objectContaining({

            studentId:
              's22556211',

            studentName:
              'Clive Correya',

            description:
              'The light in my room is not working properly.'

          })

        );


        expect(
          saveMock
        ).toHaveBeenCalled();

      }
    );



    test(
      'rejects complaint when Student ID is missing',
      async () => {

        const response =
          await request(app)

            .post(
              '/api/complaints'
            )

            .send({

              studentName:
                'Clive Correya',

              description:
                'Room light is not working.'

            });


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.success
        ).toBe(false);


        expect(
          response.body.message
        ).toBe(
          'Student ID is required'
        );

      }
    );



    test(
      'rejects complaint when Student Name is missing',
      async () => {

        const response =
          await request(app)

            .post(
              '/api/complaints'
            )

            .send({

              studentId:
                's22556211',

              description:
                'Room light is not working.'

            });


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.message
        ).toBe(
          'Student name is required'
        );

      }
    );



    test(
      'rejects complaint shorter than 5 characters',
      async () => {

        const response =
          await request(app)

            .post(
              '/api/complaints'
            )

            .send({

              studentId:
                's22556211',

              studentName:
                'Clive Correya',

              description:
                'Bad'

            });


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.message
        ).toBe(
          'Complaint must contain at least 5 characters'
        );

      }
    );



    test(
      'rejects complaint longer than 500 characters',
      async () => {

        const longComplaint =
          'A'.repeat(501);


        const response =
          await request(app)

            .post(
              '/api/complaints'
            )

            .send({

              studentId:
                's22556211',

              studentName:
                'Clive Correya',

              description:
                longComplaint

            });


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.message
        ).toBe(
          'Complaint cannot exceed 500 characters'
        );

      }
    );

  }
);



// ====================================================
// GET /api/complaints
// ====================================================

describe(
  'GET /api/complaints',
  () => {


    test(
      'returns all complaints',
      async () => {

        const sortMock =
          jest
            .fn()
            .mockResolvedValue([
              sampleComplaint
            ]);


        Complaint.find
          .mockReturnValue({

            sort:
              sortMock

          });


        const response =
          await request(app)
            .get(
              '/api/complaints'
            );


        expect(
          response.status
        ).toBe(200);


        expect(
          response.body.success
        ).toBe(true);


        expect(
          response.body.count
        ).toBe(1);


        expect(
          response.body.data
        ).toHaveLength(1);

      }
    );

  }
);



// ====================================================
// GET /api/complaints/student/:studentId
// ====================================================

describe(
  'GET /api/complaints/student/:studentId',
  () => {


    test(
      'returns complaints belonging to one student',
      async () => {

        const sortMock =
          jest
            .fn()
            .mockResolvedValue([
              sampleComplaint
            ]);


        Complaint.find
          .mockReturnValue({

            sort:
              sortMock

          });


        const response =
          await request(app)

            .get(
              '/api/complaints/student/s22556211'
            );


        expect(
          response.status
        ).toBe(200);


        expect(
          Complaint.find
        ).toHaveBeenCalledWith({

          studentId:
            's22556211'

        });


        expect(
          response.body.count
        ).toBe(1);


        expect(
          response.body.data[0].studentId
        ).toBe(
          's22556211'
        );

      }
    );

  }
);



// ====================================================
// GET /api/complaints/:id
// ====================================================

describe(
  'GET /api/complaints/:id',
  () => {


    test(
      'returns one complaint when it exists',
      async () => {

        Complaint.findById
          .mockResolvedValue(
            sampleComplaint
          );


        const response =
          await request(app)

            .get(
              `/api/complaints/${sampleComplaint._id}`
            );


        expect(
          response.status
        ).toBe(200);


        expect(
          response.body.success
        ).toBe(true);


        expect(
          response.body.data.studentId
        ).toBe(
          's22556211'
        );

      }
    );



    test(
      'returns 404 when complaint does not exist',
      async () => {

        Complaint.findById
          .mockResolvedValue(
            null
          );


        const response =
          await request(app)

            .get(
              `/api/complaints/${sampleComplaint._id}`
            );


        expect(
          response.status
        ).toBe(404);


        expect(
          response.body.message
        ).toBe(
          'Complaint not found'
        );

      }
    );

  }
);



// ====================================================
// PATCH /api/complaints/:id/status
// ====================================================

describe(
  'PATCH /api/complaints/:id/status',
  () => {


    test(
      'updates complaint status to In Progress',
      async () => {

        const updatedComplaint = {

          ...sampleComplaint,

          status:
            'In Progress'

        };


        Complaint
          .findByIdAndUpdate
          .mockResolvedValue(
            updatedComplaint
          );


        const response =
          await request(app)

            .patch(
              `/api/complaints/${sampleComplaint._id}/status`
            )

            .send({

              status:
                'In Progress'

            });


        expect(
          response.status
        ).toBe(200);


        expect(
          response.body.success
        ).toBe(true);


        expect(
          response.body.data.status
        ).toBe(
          'In Progress'
        );


        expect(
          Complaint.findByIdAndUpdate
        ).toHaveBeenCalledWith(

          sampleComplaint._id,

          {
            status:
              'In Progress'
          },

          {
            new:
              true,

            runValidators:
              true
          }

        );

      }
    );



    test(
      'updates complaint status to Resolved',
      async () => {

        const updatedComplaint = {

          ...sampleComplaint,

          status:
            'Resolved'

        };


        Complaint
          .findByIdAndUpdate
          .mockResolvedValue(
            updatedComplaint
          );


        const response =
          await request(app)

            .patch(
              `/api/complaints/${sampleComplaint._id}/status`
            )

            .send({

              status:
                'Resolved'

            });


        expect(
          response.status
        ).toBe(200);


        expect(
          response.body.data.status
        ).toBe(
          'Resolved'
        );

      }
    );



    test(
      'rejects an invalid complaint status',
      async () => {

        const response =
          await request(app)

            .patch(
              `/api/complaints/${sampleComplaint._id}/status`
            )

            .send({

              status:
                'Completed'

            });


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.success
        ).toBe(false);


        expect(
          response.body.message
        ).toBe(
          'Status must be Pending, In Progress, or Resolved'
        );


        expect(
          Complaint.findByIdAndUpdate
        ).not.toHaveBeenCalled();

      }
    );



    test(
      'rejects request when status is missing',
      async () => {

        const response =
          await request(app)

            .patch(
              `/api/complaints/${sampleComplaint._id}/status`
            )

            .send({});


        expect(
          response.status
        ).toBe(400);


        expect(
          response.body.message
        ).toBe(
          'Complaint status is required'
        );

      }
    );



    test(
      'returns 404 when complaint cannot be found',
      async () => {

        Complaint
          .findByIdAndUpdate
          .mockResolvedValue(
            null
          );


        const response =
          await request(app)

            .patch(
              `/api/complaints/${sampleComplaint._id}/status`
            )

            .send({

              status:
                'Resolved'

            });


        expect(
          response.status
        ).toBe(404);


        expect(
          response.body.message
        ).toBe(
          'Complaint not found'
        );

      }
    );

  }
);