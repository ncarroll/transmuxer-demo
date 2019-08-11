import * as muxjs from "mux.js";

let video = document.querySelector("video");
video.controls = true;
video.onerror = () => {
    console.log(
        "VIDEO Error " + video.error.code + "; details: " + video.error.message
    );
};

let assetURL = "http://localhost:8080/public/proxy.ts";

// Video and audio codec - currently not working.
//let mimeCodec = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
// Video only codec
let mimeCodec = 'video/mp4; codecs="avc1.42E01E"';

if ("MediaSource" in window && MediaSource.isTypeSupported(mimeCodec)) {
    let mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener("sourceopen", sourceOpen);
} else {
    console.error("Unsupported MIME type or codec: ", mimeCodec);
}

function sourceOpen(_) {
    let mediaSource = this;
    let sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
    let transmuxer = new muxjs.mp4.Transmuxer();
    
    fetch(assetURL).then(response => {
        return response.arrayBuffer();
    }).then(buffer => {
        console.log("Fetched asset");

        transmuxer.push(new Uint8Array(buffer));
        transmuxer.flush();
    });

    transmuxer.on('data', (segment) => {
        console.log("Remuxing data...");

        let data = new Uint8Array(segment.initSegment.byteLength + segment.data.byteLength);
        data.set(segment.initSegment, 0);
        data.set(segment.data, segment.initSegment.byteLength);

        console.log(muxjs.mp4.tools.textify(muxjs.mp4.tools.inspect(data), null, ' '));
        sourceBuffer.appendBuffer(data);
    });

    sourceBuffer.addEventListener("updateend", () => {
        if (!sourceBuffer.updating && mediaSource.readyState === "open") {
            console.log("End of stream");
            mediaSource.endOfStream();
        }

        console.log("Play video");
        video.play();
    });
}
