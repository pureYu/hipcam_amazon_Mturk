URL = window.URL || window.webkitURL;

var gumStream;
var rec;
var input;
var DEBUG=true; // Enable logging


var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

result_form_data = new FormData();


function turkGetParam( name ) {
    var regexS = "[\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var tmpURL = window.location.href;
    var results = regex.exec( tmpURL );
    if( results == null ) {
        return "";
    } else {
        return results[1];
    }
};

var log = function(){
    if(DEBUG){
        window.LOG_LEVEL='DEBUG';
        console.log.apply(console, arguments);
    }
};

function checkAwsCredentials() {
    AWS.config.credentials.get(function(err) {
      if (err) console.log('AWS.config.credentials error: ', err);
      else console.log('AWS.config.credentials: ', AWS.config.credentials);
    });
};

function togglePermissionPanel() {
    $("#shown").toggle();
    $("#hidden").toggle();
};

function startRecording() {

    var constraints = { audio: true, video:false }

	recordButton.disabled = true;
	stopButton.disabled = false;

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		log("getUserMedia() success, stream created, initializing Recorder.js ...");
		audioContext = new AudioContext();
		gumStream = stream;
		input = audioContext.createMediaStreamSource(stream);
		rec = new Recorder(input,{numChannels:1});
		rec.record();

	}).catch(function(err) {
	  	togglePermissionPanel();
    	recordButton.disabled = false;
    	stopButton.disabled = true;
	});
};

function stopRecording() {
	stopButton.disabled = true;
	recordButton.disabled = false;
	rec.stop();
	gumStream.getAudioTracks()[0].stop();
	rec.exportWAV(createRecordLinks);
};

function createRecordLinks(blob) {

	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');

	var filename = new Date().toISOString();
	var filename_for_input = new Date().getTime();
	filename_for_input = "audio_"+filename_for_input;
	var filename_w_ext = filename+".wav"

	au.controls = true;
	au.src = url;

	li.appendChild(au);
	span = document.createElement('span');
	span.setAttribute("class","recordname");
	span.textContent = filename_w_ext;
    li.appendChild(span);
	li.appendChild(document.createTextNode (" "));

	//save to disk link
    //createSaveToDiskLink(li, url, filename)

	li.appendChild(document.createTextNode (" "));
	createDeleteLink(li, filename_for_input);

	recordingsList.appendChild(li);

//    result_form_data.append(filename_for_input, blob, filename_w_ext);
	checkRecordsNumber();
};


let files_uploaded_locations = [];

const onUploadRecordComplete = function(err, data) {
    if (err) {
        log('s3 error: '+err);
        alert("Failed to upload. Please contact the Requester.");
        files_uploaded_locations = [];
//        $(recLi).remove();
        return;
    }
    log(`File uploaded successfully. ${data.Location}`);
    files_uploaded_locations.push(data.Location);

    if(files_uploaded_locations.length === 3) {
        uploadFormData();
    }
};

function uploadRecords() {

    $("#recordingsList").children().each(function() {

        let recLi = this;
        let fileBlob = $(recLi).find("audio").attr('src');  // blob:null/704424b7-1d64-4c92-8f14-1632d7246fd4
        let filename = $(recLi).find(".recordname").text(); // 2019-10-22T11:42:06.454Z.wav

        let workerId = turkGetParam('workerId');
        let assignmentId = turkGetParam('assignmentId');
        let hitId = turkGetParam('hitId');
        let fileKey = hitId + '-' + assignmentId + '-' + workerId + '-' + filename;

        log('fileKey: '+fileKey);
        log('fileBlob: '+fileBlob);

        s3.upload({
          Key: fileKey,
          Body: fileBlob,
          ContentType: 'audio/wav',
          ACL: 'bucket-owner-full-control'
        }, onUploadRecordComplete);
/*
        s3.upload({
          Key: fileKey,
          Body: fileBlob,
          ContentType: 'audio/wav',
          ACL: 'bucket-owner-full-control'
        }, function(err, data) {
          if (err) {
            log('s3 error: '+err);
            alert("Failed to upload. Please contact the Requester.");
            $(recLi).remove();
          }
          else{
            log('s3 Success: '+data);
          }
          //$(event.currentTarget).prop("disabled", false);
        });
*/
    });
};

function uploadFormData() {

    result_form_data.set('gender', $("#genderInput").val());
    result_form_data.set('language', $("#languageInput").val());
    result_form_data.set('age', $("#ageInput").val());

    if ($("#languageInput").val() == 'other') {
        result_form_data.set('other_language', $("#otherLanguageInput").val().trim());
    }

    if(files_uploaded_locations.length === 3) {
        files_uploaded_locations.forEach(function (item, index) {
            let input_name = 'file_'+(index+1);
            $('input[type=hidden][name='+input_name+']').val(item);
            result_form_data.set('file_'+(index+1), item);
        });
    }

    log("-------LOG result_form_data:");
    for (var pair of result_form_data.entries()) {
        log(pair[0]+ ', ' + pair[1]);
    }
    log('!!!');

    server_url = $('#audiorecords').attr('action')
    $.ajax({
          method : "POST",
          type: "POST",
          url: server_url,
          cache: false,
          contentType: false,
          processData: false,
          data: result_form_data,
          error: function (request, error) {
              console.log('request: ', request);
              console.log('error: ', error);
              $("#statusDiv").html("").removeClass('alert alert-success alert-danger');
              $("#errorDiv").html("An error occured while sending form data.").addClass('alert').addClass('alert-danger')
          },
          success: function (response) {
              log(response);
              $('#recordingsList').empty();
              $("#errorDiv").html('').removeClass('alert alert-danger');
              $("#statusDiv").html("Uploaded successfully.").addClass('alert').addClass('alert-success');
              result_form_data = new FormData();
              checkRecordsNumber();
              recordButton.disabled = true;
          }
    })

};

function doUploadData(event) {
    event.preventDefault();

    log('in doUploadData');
    $("#statusDiv").text("Uploading...");
    stopButton.disabled = true;
    recordButton.disabled = true;
    submitButton.disabled = true;
    resetButton.disabled = true;

    uploadRecords();
};

function createDeleteLink(container, filename_for_input) {
    var delete_link = document.createElement('a');
    delete_link.href="#";
    delete_link.innerHTML = "Delete";
	delete_link.addEventListener("click", function(event){
		  this.parentNode.remove();
		  result_form_data.delete(filename_for_input)
		  checkRecordsNumber();
		  event.preventDefault();
	})
	container.appendChild(delete_link)
};

function createSaveToDiskLink(container, url, filename) {
    var link = document.createElement('a');
	link.href = url;
	link.download = filename+".wav";
	link.innerHTML = "Save to disk";
	container.appendChild(link);
};

function checkRecordsNumber() {
    if (recordingsList.childElementCount >= 3) {
        log('in checkRecordsNumber: '+recordingsList.childElementCount+' records -> disable buttons')
        stopButton.disabled = true;
        recordButton.disabled = true;
    } else {
        log('in checkRecordsNumber: '+recordingsList.childElementCount+' records -> unable buttons')
        stopButton.disabled = true;
        recordButton.disabled = false;
    }

};
