// const submitForm = () => {
//     let formData = {};
//     formData.plant_name = $('#first_name').val();
//     formData.category = $('#last_name').val();
//     formData.care = $('#email').val();

//     console.log("Plant Form Submitted: ", formData);
// };
const submitForm = () => {
    let formData = {
        title: $('#first_name').val(),
        link: $('#last_name').val() || "Learn More",
        description: $('#email').val(),
        image: "images/plant1.png" // Default fallback image
    };

    console.log("Plant Form Submitted: ", formData);

    // Dynamically append the new plant card to the screen
    addCards([formData]);

    // Close the modal and clear input fields
    $('.modal').modal('close');
    $('#first_name').val('');
    $('#last_name').val('');
    $('#email').val('');
};

const addCards = (items) => {
    items.forEach(item => {
        let itemToAppend = 
        '<div class="col s12 m4 center-align">' +
            '<div class="card medium">' +
                '<div class="card-image waves-effect waves-block waves-light">' +
                    '<img class="activator" src="' + item.image + '">' +
                '</div>' +
                '<div class="card-content">' +
                    '<span class="card-title activator grey-text text-darken-4">' + item.title + '<i class="material-icons right">more_vert</i></span>' +
                    '<p><a href="#">' + item.link + '</a></p>' +
                '</div>' +
                '<div class="card-reveal">' +
                    '<span class="card-title grey-text text-darken-4">' + item.title + '<i class="material-icons right">close</i></span>' +
                    '<p class="card-text">' + item.description + '</p>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        $("#card-section").append(itemToAppend);
    });
};

// Fetch data from GET REST Endpoint
const getPlants = () => {
    $.get('/api/plants', (response) => {
        if (response.statusCode === 200) {
            addCards(response.data);
        }
    });
};

$(document).ready(function(){
    $('.materialboxed').materialbox();
    $('.modal').modal();

    $('#formSubmit').click(() => {
        submitForm();
    });

    // Load cards from API
    getPlants();
});