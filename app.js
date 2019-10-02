//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

result_form_data = new FormData();

togglePermissionPanel();

function togglePermissionPanel() {
    $("#shown").toggle();
    $("#hidden").toggle();
}

function startRecording() {
	console.log("recordButton clicked");

    var constraints = { audio: true, video:false }

	recordButton.disabled = true;
	stopButton.disabled = false;

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
		audioContext = new AudioContext();
		/*  assign to gumStream for later use  */
		gumStream = stream;
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);
		rec = new Recorder(input,{numChannels:1})
		//start the recording process
		rec.record()
		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
	});
}

function stopRecording() {
	console.log("stopButton clicked");
	stopButton.disabled = true;
	recordButton.disabled = false;

	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createRecordLinks);
}

function createRecordLinks(blob) {

	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();
	var filename_for_input = new Date().getTime();
	filename_for_input = "audio_"+filename_for_input;
	var filename_w_ext = filename+".wav"

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	li.appendChild(au); //add the new audio element to li
	span = document.createElement('span');
	span.setAttribute("class","recordname");
//	span.textContent = filename_for_input+": "+filename_w_ext;
	span.textContent = filename_w_ext;
    li.appendChild(span)
	li.appendChild(document.createTextNode (" "))//add a space in between

	//save to disk link
    //createSaveToDiskLink(li, url, filename)

    //delete link
	li.appendChild(document.createTextNode (" "))//add a space in between
	createDeleteLink(li, filename_for_input)

	//add the li element to the ol
	recordingsList.appendChild(li);

    result_form_data.append(filename_for_input, blob, filename_w_ext);
	checkRecordsNumber();
}

function doUploadData(event) {
    event.preventDefault();

    console.log('in doUploadData');
    $("#statusDiv").text("Uploading...");
    $("#submitButton").prop("disabled", true);
//    $(event.currentTarget).prop("disabled", true);

    result_form_data.set('gender', $("#genderInput").val());
    result_form_data.set('age', $("#ageInput").val());

    console.log("-------LOG result_form_data:");
    for (var pair of result_form_data.entries()) {
        console.log(pair[0]+ ', ' + pair[1]);
    }

    $.ajax({
          method : "POST",
          type: "POST",
          url: "http://127.0.0.1:5000/",
          cache: false,
          contentType: false,
          processData: false,
          data: result_form_data,                         // Setting the data attribute of ajax with file_data
          error: function (request, error) {
              console.log(arguments);
              $("#statusDiv").html("").removeClass('alert alert-success alert-danger');
              $("#errorDiv").html("An error occured while sending form data.").addClass('alert').addClass('alert-danger')
          },
          success: function (response) {
              console.log(response);
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
	container.appendChild(delete_link) //add the delete link to container
}

function createSaveToDiskLink(container, url, filename) {
    var link = document.createElement('a');
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";
	container.appendChild(link);
}

function checkRecordsNumber() {
    if (recordingsList.childElementCount >= 3) {
        console.log('in checkRecordsNumber: '+recordingsList.childElementCount+' records -> disable buttons')
        stopButton.disabled = true;
        recordButton.disabled = true;
    } else {
        console.log('in checkRecordsNumber: '+recordingsList.childElementCount+' records -> unable buttons')
        stopButton.disabled = true;
        recordButton.disabled = false;
    }

}
