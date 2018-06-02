// @ts-check
import {html, LitElement} from '../modules/lit-html-element/lit-element.js';
import {repeat} from '../modules/lit-html/lib/repeat.js';
// import {getBLEThingy52} from './ble-thingy52.js';
import {MatButton} from '../local_modules/mat-button/mat-button.js';
import {SampleVisualizer} from '../local_modules/sample-visualizer/sample-visualizer.js';

import {AudioUtils} from '../local_modules/audio-utils/audio-utils.js';

import {Controllers} from '../local_modules/instrument-control/instrument-control.js';
import { MIDI_MSG_TYPE_NAME, MIDI_MSG_TYPE } from '../local_modules/instrument-control/defs.js';
import { ControllerSettings } from '../local_modules/controller-settings/controller-settings.js';


export class MainApp extends LitElement {

  constructor() {
    super();
    this._devices = [];

    this._notes = [];

    this._onTemperatureChange = this._onTemperatureChange.bind(this);
    this._onAccelChange = this._onAccelChange.bind(this);
    this._onButtonChange = this._onButtonChange.bind(this);
    this._loadSound = this._loadSound.bind(this);
    this._recordToggle = this._recordToggle.bind(this);
    this._playRecording = this._playRecording.bind(this);

    this.playEffectNote = this.playEffectNote.bind(this);
    this.stopNote = this.stopNote.bind(this);

    // getBLEThingy52().addEventListener('message', (msg) => { console.log(msg.detail) });
    // getBLEThingy52().addEventListener('connect', this._handleConnect.bind(this));

    const toneDiff = Math.pow(2, 1/12);

    for(let [type, controller] of Controllers) {
      console.log('Controller registered:', type);
      controller.addEventListener('connect', (e) => console.log('connect', e.detail));
      controller.addEventListener('midi-event', (e) => {
        const msg = e.detail.data;
        console.log('midi-event', MIDI_MSG_TYPE_NAME[msg.type], msg);
        
        if(msg.type === MIDI_MSG_TYPE.NOTE_ON) {
          this.playEffectNote(Math.pow(toneDiff, msg.note-60), msg.note);
        } else if(msg.type === MIDI_MSG_TYPE.NOTE_OFF) {
          this.stopNote(msg.note);
        }
      });
    }

    requestAnimationFrame(this.initialize.bind(this));
  }

  static get properties() {
    return {
      isRecording: {
        type: Boolean
      }
    }
  }

  initialize() {
    //this._initRecording();

    this._recording = this.$('recording');
  }

  _initRecording() {
    if (navigator.getUserMedia) {
      let constraints = { audio: true, video: false };
      let chunks = [];

      let onSuccess = stream => {
        this.mediaRecorder = new MediaRecorder(stream, {mimeType: 'audio/webm'});

        this._visualize(stream);

        this.mediaRecorder.onstop = (e) => {
          var blob = new Blob(chunks, { 'type' : 'audio/webm' });
          chunks = [];

          this._convertSampleBlob(blob);
          this.isRecording = false;
          // debounce a bit ;)
          // setTimeout(() => {
          //   this.$.record.classList.remove('recording');
          //   this.$.record.disabled = false;
          // }, 1000);
        }
      
        this.mediaRecorder.ondataavailable = (e) => {
          console.log(e.data);
          chunks.push(e.data);
        }
      }

      let onError = err => {
        console.log(err);
      }

      navigator.getUserMedia(constraints, onSuccess, onError);
    } else {
      console.log('getUserMedia is not supported!');
    }
  }

  _recordToggle() {
    console.log("_recordToggle", this.isRecording, this.mediaRecorder);
    if(this.mediaRecorder) {
      if(this.isRecording) {
        this.mediaRecorder.stop();
      } else {
        this.mediaRecorder.start();
        this.isRecording = true;
      }
    }
  }

  playEffectNote(rate, note) {
    const aCtx = AudioUtils.ctx;
    const src = aCtx.createBufferSource();
    if(rate) {
      src.playbackRate.value = rate;
    }
    src.buffer = this.lastRecording;
    src.connect(aCtx.destination);
    src.start(0);
    this._notes[note] = src;
  }

  stopNote(note) {
      let src = this._notes[note];
      if(src) {
          src.stop();
      }
  }

  get lastRecording() {
    return this._lastRecording;
  }

  set lastRecording(val) {
    this._lastRecording = val;
    this.$('lastRec').data = val;
  }

  _convertSampleBlob(blob) {
    const aCtx = AudioUtils.ctx;
    var reader = new FileReader();
    reader.onload = () => {
        console.log(reader.result);
        aCtx.decodeAudioData(reader.result, buffer => {
            this.lastRecording = buffer;
            console.log(buffer);
        });
    };
    reader.readAsArrayBuffer(blob);
  }

  _visualize(stream) {
    const aCtx = AudioUtils.ctx;

    let source = aCtx.createMediaStreamSource(stream);

    let analyser = aCtx.createAnalyser();
    analyser.fftSize = 2048;
    let dataArray = new Float32Array(analyser.fftSize);

    this._recording.data = dataArray;

    source.connect(analyser);

    let draw = () => {
      requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(dataArray);
      this._recording.data = dataArray;
    }

    draw();
  }

  _handleConnect(evt) {
    const msg = evt.detail;

    if(msg.type === 'ble') {
      this._attachDevice(msg.device);
    }
  }

  render() {
    return html`
      <style>
        :host {
          font-family: Roboto, Arial;
        }
        .mini-button {
          font-size: 8pt;
        }
        .title {
          font-weight: bold;
        }

        .aaa {
          --line-color:blue;
          --background-color:yellow;
          width:350px;
          height:200px;
        }

        .bbb {
          --line-color:red;
          --background-color:green;
          width: 50vw;
          height: 200px;
        }

        .ccc {
          width: 100%;
          height: 150px;
        }

      </style>
      <h1>usBTronica</h1>
      <br>
      <mat-button on-click='${ _ => this._enableAudio()}'>Start audio</mat-button>
      <mat-button id="btnrecord" on-click='${ this._recordToggle }'>${this.isRecording ? "Stop recording" : "Start recording"}</mat-button>
      <mat-button on-click='${ _ => this._doScanForDevices()}'>Scan for devices</mat-button>
      <controller-settings></controller-settings>
      <sample-visualizer id='recording' class="ccc"></sample-visualizer>
      <sample-visualizer class="aaa" on-click='${ this._loadSound }'>AAA</sample-visualizer>
      <sample-visualizer id="lastRec" on-click='${ this._playRecording }'class="bbb"></sample-visualizer>
      <sample-visualizer class="ccc" on-click='${ this._loadSound }'>CCC</sample-visualizer><br>
    `;
  }

  _doScanForDevices() {
    for(let [type, controller] of Controllers) {
      if(controller.scan) {
        controller.scan();
      }
    }
    
  }

  _enableAudio() {
    const aCtx = AudioUtils.ctx;
    this._initRecording();
    // this could just be part of a splash screen or other natural element the user clicks anyway
  }

  _loadSound(evt) {
    this.loadEffect('./assets/audio/test.ogg', evt.target);
  }

  _playRecording() {
    const aCtx = AudioUtils.ctx;
    const src = aCtx.createBufferSource();
    src.buffer = this.lastRecording;
    src.connect(aCtx.destination);
    src.start(0);
  }

  loadEffect(url, target) {
    const aCtx = AudioUtils.ctx;

    const src = aCtx.createBufferSource();

    fetch(url)
    .then(response => response.arrayBuffer() )
    .then((buffer) => {
      aCtx.decodeAudioData(buffer, decodedData => {
        src.buffer = decodedData;

        target.data = decodedData;

        src.connect(aCtx.destination);
        src.start(0);
      });
    });
  }
}

customElements.define('main-app', MainApp.withProperties());