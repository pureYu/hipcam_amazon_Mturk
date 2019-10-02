function ValidateAll(event) {
    var errorCounter = 0;
    var errorMessage = "";

    // Gender
    if ($("#genderInput").val() == 'Select') {
        errorMessage += " Please select your gender<br/>";
        errorCounter++;
    }

    // Age
    age = $("#ageInput").val()
    if (age == '') {
        errorMessage += " Enter your age<br/>";
        errorCounter++;
    } else if (!$.isNumeric(age) || isNaN(age) || age < 5 || age > 100 ) {
        errorMessage += " Invalid age - should be numeric, between 5 and 99<br/>";
        errorCounter++;
    }

    // Files
    files_recorded = $("#recordingsList").children().length;
    if (files_recorded != 3) {
        errorMessage += " Record 3 audio files<br/>";
        errorCounter++;
    }

    $("#errorDiv").html(errorMessage);
    if (errorCounter == 0) {
        $("#errorDiv").removeClass('alert').removeClass('alert-danger')
        console.log('Thank you! Form submitting...');
        doUploadData(event);
        return true;
    } else {
        $("#errorDiv").addClass('alert').addClass('alert-danger')
        return false;
    }
}