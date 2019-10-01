//navigator.webkitGetUserMedia({"audio": true}, function(stream) {
//    console.log("Inside webkitGetUserMedia")
//    $("#shown").toggle();
//    $("#hidden").toggle();
//}, function(err) {
//    if(err === PERMISSION_DENIED) {
//    }
//});

//window.onload = function init() {
//    try {
//        // webkit shim
//        window.AudioContext = window.AudioContext || window.webkitAudioContext;
//        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
//        window.URL = window.URL || window.webkitURL;
//
//        audio_context = new AudioContext;
//        console.log("Inside getUserMedia, audio context set up.")
//        $("#shown").toggle();
//        $("#hidden").toggle();
//        console.log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
//    } catch (e) {
//        alert('No web audio support in this browser!');
//    }
//
//    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
//        console.log('No live audio input: ' + e);
//    });
//};