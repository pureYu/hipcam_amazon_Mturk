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
    createSaveToDiskLink(li, url, filename)

	li.appendChild(document.createTextNode (" "));
	createDeleteLink(li, filename_for_input);

	recordingsList.appendChild(li);

//    result_form_data.append(filename_for_input, blob, filename_w_ext);
	checkRecordsNumber();
};


let files_uploaded_locations = [];

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

const uploadFile = fileData => {
  return new Promise(function(resolve, reject) {
    console.log('start - ', fileData.fileKey, fileData.fileBlob);

      fetch(fileData.fileBlob)
          .then(r => {return r.blob()})
          .then(blobFile => new File([blobFile], fileData.fileKey, { type: "audio/wav" }))
          .then(function(file){
                log(file);
//                var link = document.createElement("a"); // Or maybe get it from the current document
//                link.href = URL.createObjectURL(file);
//                link.download = fileData.fileKey;
//                link.innerHTML = "Click here to download the file ";
//                document.body.appendChild(link); // Or append it whereever you want


                s3.upload(
                  {
                    Key: fileData.fileKey,
                    Body: file,
                    ContentType: 'audio/wav',
                    ACL: 'bucket-owner-full-control'
                  },
                  function(err, data) {
                    if (err) {
                        log('s3 error: '+err);
                        alert("Failed to upload. Please contact the Requester.");
                        files_uploaded_locations = [];
                        reject(err)
                    }
                    log(`File uploaded successfully. ${data.Location}`);
                    files_uploaded_locations.push(data.Location);

                    if(files_uploaded_locations.length === 3) {
                        files_uploaded_locations.forEach(function (item, index) {
                            let input_name = 'file_'+(index+1);
                            $('input[type=hidden][name='+input_name+']').val(item);
                        });
                    }

                    resolve(true)
                   }
                )
          });


  })
}

const lockForm = () => {
    $('#statusDiv').text('Uploading...');
    stopButton.disabled = true;
    recordButton.disabled = true;
    submitButton.disabled = true;
    resetButton.disabled = true;
}

const getFileData = recLi => {
  let fileBlob = $(recLi).find('audio').attr('src'); // blob:null/704424b7-1d64-4c92-8f14-1632d7246fd4
  let filename = $(recLi).find('.recordname').text() ;// 2019-10-22T11:42:06.454Z.wav
  let fileKey = hitId + '-' + assignmentId + '-' + workerId + '-' + filename;

  log('fileKey: ' + fileKey);
  log('fileBlob: ' + fileBlob);

  return { fileKey, fileBlob };
}

const startUploadFiles = () => {
    log('in doUploadData');

    return new Promise(resolve => {
        const workerId = turkGetParam('workerId');
        const assignmentId = turkGetParam('assignmentId');
        const hitId = turkGetParam('hitId');

        const filesData = [];
        $('#recordingsList').children().each(function() {
            filesData.push(getFileData(this));
        })

        Promise.all([
            uploadFile(filesData[0]),
            uploadFile(filesData[1],
            uploadFile(filesData[2]))
            ]
        )
        .then(() => {
            log('all the files have been uploaded');
            resolve(true);
        })
        .catch(error => {
            log('something went wrong during uploading');
            log(error);
            resolve(false);
        })
  })
}

const validatedUpload = async event => {
    log('-------------------------');
    log('doUploadDataAsync', 1);

    lockForm();

    try {
        const filesUploadResult = await startUploadFiles();
        log(filesUploadResult);
        return filesUploadResult;
    } catch (error) {
        console.log(error);
        return false;
    }
}






























