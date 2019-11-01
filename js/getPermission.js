window.onload = function init() {
    try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        window.URL = window.URL || window.webkitURL;

        audio_context = new AudioContext;

        navigator.mediaDevices.getUserMedia({ audio: true, video:false }).then(function(stream) {
            togglePermissionPanel();
        });

    } catch (e) {
//        console.log('No web audio support in this browser!');
    }

};