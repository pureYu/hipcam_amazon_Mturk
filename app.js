URL = window.URL || window.webkitURL;

var gumStream;
var rec;
var input;
var DEBUG=false; // Enable logging


var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

result_form_data = new FormData();


var log = function(){
    if(DEBUG){
        console.log.apply(console, arguments);
    }
}

function togglePermissionPanel() {
    $("#shown").toggle();
    $("#hidden").toggle();
}

function startRecording() {
	log("recordButton clicked");

    var constraints = { audio: true, video:false }

	recordButton.disabled = true;
	stopButton.disabled = false;

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		log("getUserMedia() success, stream created, initializing Recorder.js ...");
		audioContext = new AudioContext();
		gumStream = stream;
		input = audioContext.createMediaStreamSource(stream);
		rec = new Recorder(input,{numChannels:1})
		rec.record()
		log("Recording started");

	}).catch(function(err) {
	  	togglePermissionPanel();
    	recordButton.disabled = false;
    	stopButton.disabled = true;
	});
}

function stopRecording() {
	log("stopButton clicked");
	stopButton.disabled = true;
	recordButton.disabled = false;
	rec.stop();
	gumStream.getAudioTracks()[0].stop();
	rec.exportWAV(createRecordLinks);
}

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

    result_form_data.append(filename_for_input, blob, filename_w_ext);
	checkRecordsNumber();
}

function doUploadData(event) {
    event.preventDefault();

    log('in doUploadData');
    $("#statusDiv").text("Uploading...");
    $("#submitButton").prop("disabled", true);

    result_form_data.set('gender', $("#genderInput").val());
    result_form_data.set('age', $("#ageInput").val());

    log("-------LOG result_form_data:");
    for (var pair of result_form_data.entries()) {
        log(pair[0]+ ', ' + pair[1]);
    }

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
              log(arguments);
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
          }
    })
}

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
}

function createSaveToDiskLink(container, url, filename) {
    var link = document.createElement('a');
	link.href = url;
	link.download = filename+".wav";
	link.innerHTML = "Save to disk";
	container.appendChild(link);
}

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

}
