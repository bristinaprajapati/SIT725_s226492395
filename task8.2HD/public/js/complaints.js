const complaintForm =
  document.getElementById('complaintForm');

const studentIdInput =
  document.getElementById('studentId');

const studentNameInput =
  document.getElementById('studentName');

const descriptionInput =
  document.getElementById('description');

const messageBox =
  document.getElementById('message');

const complaintsContainer =
  document.getElementById('complaintsContainer');

const loadComplaintsButton =
  document.getElementById('loadComplaints');

const complaintSearchStudentId =
  document.getElementById('complaintSearchStudentId');

const submitComplaintButton =
  document.getElementById('submitComplaintButton');


// ----------------------------------------------------
// Prefill logged-in student name if available
// ----------------------------------------------------

function loadLoggedInUser() {

  const storedUser =
    localStorage.getItem('user');

  if (!storedUser) {
    return;
  }

  try {

    const user =
      JSON.parse(storedUser);

    if (
      user &&
      user.role === 'student' &&
      user.name
    ) {

      studentNameInput.value =
        user.name;

    }

  }
  catch (error) {

    console.error(
      'Unable to read logged-in user:',
      error
    );

  }

}


// ----------------------------------------------------
// Display message
// ----------------------------------------------------

function displayMessage(message, type) {

  messageBox.textContent =
    message;

  messageBox.className =
    `message ${type}`;

  messageBox.style.display =
    'block';

}


// ----------------------------------------------------
// Clear message
// ----------------------------------------------------

function clearMessage() {

  messageBox.textContent =
    '';

  messageBox.className =
    'message';

  messageBox.style.display =
    'none';

}


// ----------------------------------------------------
// Submit complaint
// ----------------------------------------------------

complaintForm.addEventListener(
  'submit',
  async function (event) {

    event.preventDefault();

    clearMessage();


    const studentId =
      studentIdInput.value.trim();

    const studentName =
      studentNameInput.value.trim();

    const description =
      descriptionInput.value.trim();


    // ------------------------------------------------
    // Client-side validation
    // ------------------------------------------------

    if (!studentId) {

      displayMessage(
        'Please enter your Student ID.',
        'error'
      );

      studentIdInput.focus();

      return;

    }


    if (!studentName) {

      displayMessage(
        'Please enter your name.',
        'error'
      );

      studentNameInput.focus();

      return;

    }


    if (!description) {

      displayMessage(
        'Please describe your complaint.',
        'error'
      );

      descriptionInput.focus();

      return;

    }


    if (description.length < 5) {

      displayMessage(
        'Complaint must contain at least 5 characters.',
        'error'
      );

      descriptionInput.focus();

      return;

    }


    if (description.length > 500) {

      displayMessage(
        'Complaint cannot exceed 500 characters.',
        'error'
      );

      descriptionInput.focus();

      return;

    }


    // ------------------------------------------------
    // Disable button while submitting
    // ------------------------------------------------

    if (submitComplaintButton) {

      submitComplaintButton.disabled =
        true;

      submitComplaintButton.textContent =
        'Submitting...';

    }


    try {

    const token = localStorage.getItem('token');

const response =
  await fetch('/api/complaints', {

    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },

          body: JSON.stringify({
            studentId,
            studentName,
            description
          })

        });


      const result =
        await response.json();


      if (!response.ok) {

        displayMessage(
          result.message ||
          'Unable to submit complaint.',
          'error'
        );

        return;

      }


      displayMessage(
        result.message ||
        'Complaint submitted successfully.',
        'success'
      );


      // Clear only complaint description
      descriptionInput.value =
        '';


      // Put same Student ID into search field
      complaintSearchStudentId.value =
        studentId;


      // Automatically reload submitted complaints
      await loadStudentComplaints(
        studentId
      );

    }

    catch (error) {

      console.error(
        'Complaint submission error:',
        error
      );


      displayMessage(
        'Unable to connect to the server.',
        'error'
      );

    }

    finally {

      if (submitComplaintButton) {

        submitComplaintButton.disabled =
          false;

        submitComplaintButton.textContent =
          'Submit Complaint';

      }

    }

  }
);


// ----------------------------------------------------
// Load complaints button
// ----------------------------------------------------

loadComplaintsButton.addEventListener(
  'click',
  function () {

    loadStudentComplaints();

  }
);


// ----------------------------------------------------
// Allow Enter key in search box
// ----------------------------------------------------

complaintSearchStudentId.addEventListener(
  'keydown',
  function (event) {

    if (event.key === 'Enter') {

      event.preventDefault();

      loadStudentComplaints();

    }

  }
);


// ----------------------------------------------------
// Retrieve student's complaints
// ----------------------------------------------------

async function loadStudentComplaints(
  submittedStudentId = null
) {

  let studentId;


  // If complaint was just submitted,
  // use that Student ID
  if (submittedStudentId) {

    studentId =
      submittedStudentId.trim();

  }
  else {

    studentId =
      complaintSearchStudentId
        .value
        .trim();

  }


  // ------------------------------------------------
  // Validate Student ID
  // ------------------------------------------------

  if (!studentId) {

    complaintsContainer.innerHTML = `
      <p class="error-text">
        Please enter your Student ID first.
      </p>
    `;

    complaintSearchStudentId.focus();

    return;

  }


  complaintsContainer.innerHTML = `
    <p>
      Loading complaints...
    </p>
  `;


  try {

const token = localStorage.getItem('token');

const response =
  await fetch(
    `/api/complaints/student/${encodeURIComponent(studentId)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );


    const result =
      await response.json();


    if (!response.ok) {

      complaintsContainer.innerHTML = `
        <p class="error-text">
          ${escapeHtml(
            result.message ||
            'Unable to load complaints.'
          )}
        </p>
      `;

      return;

    }


    displayComplaints(
      result.data
    );

  }

  catch (error) {

    console.error(
      'Complaint loading error:',
      error
    );


    complaintsContainer.innerHTML = `
      <p class="error-text">
        Unable to connect to the server.
      </p>
    `;

  }

}


// ----------------------------------------------------
// Display complaint cards
// ----------------------------------------------------

function displayComplaints(complaints) {

  if (
    !Array.isArray(complaints) ||
    complaints.length === 0
  ) {

    complaintsContainer.innerHTML = `
      <p>
        No complaints have been submitted yet.
      </p>
    `;

    return;

  }


  complaintsContainer.innerHTML =
    '';


  complaints.forEach(
    (complaint, index) => {

      const card =
        document.createElement('div');


      card.classList.add(
        'complaint-item'
      );


      // ----------------------------------------------
      // Date
      // ----------------------------------------------

      let createdDate =
        'Unknown date';


      if (complaint.createdAt) {

        const date =
          new Date(
            complaint.createdAt
          );


        if (!Number.isNaN(date.getTime())) {

          createdDate =
            date.toLocaleString();

        }

      }


      // ----------------------------------------------
      // Status
      // ----------------------------------------------

      const status =
        complaint.status ||
        'Pending';


      // ----------------------------------------------
      // Complaint card
      // ----------------------------------------------

      card.innerHTML = `

        <div class="complaint-header">

          <strong>
            Complaint ${index + 1}
          </strong>


          <span
            class="status ${getStatusClass(status)}"
          >
            ${escapeHtml(status)}
          </span>

        </div>


        <p>
          ${escapeHtml(
            complaint.description
          )}
        </p>


        <div class="complaint-details">

          <small>
            <strong>
              Student:
            </strong>

            ${escapeHtml(
              complaint.studentName || ''
            )}
          </small>

          <br>

          <small>
            <strong>
              Student ID:
            </strong>

            ${escapeHtml(
              complaint.studentId || ''
            )}
          </small>

          <br>

          <small>
            <strong>
              Submitted:
            </strong>

            ${escapeHtml(
              createdDate
            )}
          </small>

        </div>

      `;


      complaintsContainer
        .appendChild(card);

    }
  );

}


// ----------------------------------------------------
// Status styling
// ----------------------------------------------------

function getStatusClass(status) {

  if (status === 'Resolved') {

    return 'resolved';

  }


  if (status === 'In Progress') {

    return 'progress';

  }


  return 'pending';

}


// ----------------------------------------------------
// Basic HTML escaping
// ----------------------------------------------------

function escapeHtml(value) {

  const div =
    document.createElement('div');

  div.textContent =
    String(value ?? '');

  return div.innerHTML;

}


// ----------------------------------------------------
// Initial page setup
// ----------------------------------------------------

loadLoggedInUser();

clearMessage();