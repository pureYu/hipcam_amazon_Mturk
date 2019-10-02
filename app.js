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
var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

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
	pauseButton.disabled = false

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		//update the format
		//document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;

		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/*
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
    	pauseButton.disabled = true
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");

	//disable the stop button, enable the record too allow for new recordings
	stopButton.disabled = true;
	recordButton.disabled = false;
	pauseButton.disabled = true;

	//reset button just in case the recording is stopped while paused
	pauseButton.innerHTML="Pause";

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
	span.textContent = filename_for_input+": "+filename_w_ext;
    li.appendChild(span)
	li.appendChild(document.createTextNode (" "))//add a space in between
	//li.appendChild(document.createTextNode(filename_w_ext))  //add the filename to the li

	//save to disk link
    createSaveToDiskLink(li, url, filename)

	//upload link
	li.appendChild(document.createTextNode (" "))//add a space in between
    createUploadLink(li, blob, filename)

    //input for file uploading
    //createInputFile(li, filename_w_ext, filename_for_input);

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
              $("#statusDiv").text("");
              $("#errorDiv").html("An error occured while sending form data.");
              $("#errorDiv").addClass('alert').addClass('alert-danger')
          },
          success: function (response) {
              console.log(response);
              $('#recordingsList').empty();
              $("#errorDiv").html('').removeClass('alert').removeClass('alert-danger');
              $("#statusDiv").text("Uploaded successfully.");
              result_form_data = new FormData();
              checkRecordsNumber();
          }
    })


}


function createInputFile(container, filename, filename_for_input) {
    var input_file = document.createElement('input');
    input_file.type = 'file';
    input_file.name = 'file_'+filename_for_input;
    input_file.innerHTML = filename;
    input_file.style = 'display:none'
    container.appendChild(input_file);
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

function createUploadLink(container, blob, filename) {
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
        var xhr=new XMLHttpRequest();
        xhr.onload=function(e) {
            if(this.readyState === 4) {
                console.log("Server returned: ",e.target.responseText);
            }
        };
        var fd=new FormData();
        fd.append("audio_data", blob, filename);
        xhr.open("POST","upload.php",true);
        xhr.send(fd);
	})
	container.appendChild(upload)//add the upload link to li
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
        pauseButton.disabled = true;
    } else {
        console.log('in checkRecordsNumber: '+recordingsList.childElementCount+' records -> unable buttons')
        stopButton.disabled = true;
        recordButton.disabled = false;
        pauseButton.disabled = true;
    }

}
