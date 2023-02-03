const SOUND_SOURCE_FILENAME_PREFIX = "assets/audio/";

let SOUND_SOURCE_Y_POSITIONS = [];

for (let index = 0; index < 20; index++) {
  const element = index * -5 + 127;
  SOUND_SOURCE_Y_POSITIONS.push(element);
}

const PAN_OFFSET_DEG = 45;
const AMP_RANGE_PX = 25; // this could be smaller

const MIC_ANGLE_FL = -45;
const MIC_ANGLE_FR = 45;
const MIC_ANGLE_BR = 135;
const MIC_ANGLE_BL = -135;

const DEFAULT_SOUND_SOURCE_AUDIO_RADIUS = 40;
const DEFAULT_SOUND_SOURCE_POINT_RADIUS = 5;

const BUFF_WIDTH = 500;
const BUFF_HEIGHT = 500;

let bg;

let cursor;
let mouseYSmoothed = 0;
let mouseXSmoothed = 0;
let rotSmoothed = 0;
let easingPos = 0.2;
let easingRot = 0.2;

let cursorSVG;

function getHeadAngle() {
  return .8 * constrain(int(mouseX - windowWidth / 2), -BUFF_WIDTH / 2, BUFF_WIDTH / 2);
}

class SoundSource {
  constructor(filepath, x, y, soundSourceAudioRadius = DEFAULT_SOUND_SOURCE_AUDIO_RADIUS) {
    this.filepath = filepath;

    this.x = x;
    this.y = y;

    this.FL = new loadSound(filepath + "BL.wav");
    this.FR = new loadSound(filepath + "BR.wav");
    this.BR = new loadSound(filepath + "FR.wav");
    this.BL = new loadSound(filepath + "FL.wav");

    this.graphicRadius = DEFAULT_SOUND_SOURCE_POINT_RADIUS;
    this.soundRadius = soundSourceAudioRadius;
    this.isPlaying = false;
  }

  loop() {
    // Loops playback of sound files
    this.FL.loop();
    this.FR.loop();
    this.BR.loop();
    this.BL.loop();
    this.isPlaying = false;
  }

  updateAudio() {
    let headAngle = getHeadAngle();
    let pos = mouseY;
    // Pan and fade sound as the cursor moves
    this.mapToSurround(this.FL, headAngle, pos, MIC_ANGLE_FL);
    this.mapToSurround(this.FR, headAngle, pos, MIC_ANGLE_FR);
    this.mapToSurround(this.BR, headAngle, pos, MIC_ANGLE_BR);
    this.mapToSurround(this.BL, headAngle, pos, MIC_ANGLE_BL);
  }

  mapToSurround(file, headAngle, pos, centerAngle) {
    // compute distance to sound source
    let distanceAmpWeight = map(constrain(abs(this.y - pos), 0, AMP_RANGE_PX), 0, AMP_RANGE_PX, 1.0, 0.0);

    // compute cosine of incident angle to sound source
    let angleAmpWeight = (cos(radians(headAngle - centerAngle)) + 1) / 2;

    // set amp based on both of these weights
    file.amp(angleAmpWeight * distanceAmpWeight);

    // set pan according to which side the sound is on, constrained and mapped
    let pan = 0.0;

    // handle 360 wrap around for panning
    let relativeAngle = headAngle - centerAngle;
    if (relativeAngle >= 180) {
      relativeAngle = relativeAngle - 360;
    } else if (relativeAngle <= -180) {
      relativeAngle = relativeAngle + 360;
    }

    if (relativeAngle <= 0) {
      let panAngle = constrain(relativeAngle, -PAN_OFFSET_DEG, 0);
      pan = map(panAngle, -PAN_OFFSET_DEG, 0, 1.0, 0.0);
    } else {
      let panAngle = constrain(relativeAngle, 0, PAN_OFFSET_DEG);
      pan = map(panAngle, 0, PAN_OFFSET_DEG, 0.0, -1.0);
    }
    file.pan(pan);
  }

  draw() {
    fill(0, 0, 0);
    ellipse(this.x, this.y, this.graphicRadius, this.graphicRadius);
    line(0, this.y, windowWidth, this.y);
  }

  update() {
    this.updateAudio();
  }
}

class SoundSourceArray {
  // accept file path and an array of y positions for sources
  constructor(filepath, yPositions = []) {
    this.filepath = filepath;
    this.yPositions = yPositions;

    // init sound sources array
    this.soundSources = [];

    // iterate over y positions and create SoundSource objects at each position
    if (yPositions != []) {
      for (const [sourceIndex, yPos] of yPositions.entries()) {
        let soundSource = new SoundSource(filepath + str(sourceIndex), windowWidth / 2, BUFF_HEIGHT * yPos / 100, DEFAULT_SOUND_SOURCE_AUDIO_RADIUS);
        this.soundSources.push(soundSource);
      }
    }
  }

  // loop all sound sources
  loop() {
    this.soundSources.forEach(soundSource => {
      soundSource.loop()
    });
  }

  // update all sound sources
  update() {
    this.soundSources.forEach(soundSource => {
      soundSource.update()
    });
  }
}

let soundSourceArray;

function preload() {
  cursor = loadImage('assets/graphics/cursor.svg');
  soundFormats('mp3', 'wav');

  soundSourceArray = new SoundSourceArray(SOUND_SOURCE_FILENAME_PREFIX, SOUND_SOURCE_Y_POSITIONS);

  trailSVG = loadSVG('assets/graphics/trail.svg');
  trailIMG = loadImage('assets/graphics/trail.svg')
  waterIMG = loadImage('assets/graphics/water.svg')
  cursorIMG = loadImage('assets/graphics/cursor.svg');
}

function drawCursor(x, y, angle) {
  noStroke();
  image(cursor, x - 50, y - 50);
}

function setup() {
  // create main Canvas
  createCanvas(windowWidth, windowHeight, SVG);
  // create a buffer to add everything to
  buff = createGraphics(BUFF_WIDTH, BUFF_HEIGHT, SVG);
  buff.image(trailSVG, 0, 0)

  const gElements = document.getElementsByTagName("g")
  const svgs = gElements[1].getElementsByTagName("svg")
  const trailElement = svgs[0]
  trailPath = trailElement.getElementsByTagName("path")[0]
  trailTotalLength = trailPath.getTotalLength();
  buff.noStroke()
  
  noCursor();

  soundSourceArray.update();
  soundSourceArray.loop();
}

function draw() {
  buff.clear()
  clear()
  background("#35432D");
  fill("#F2F2E1");
  textAlign(CENTER);
  textSize(18);
  textFont('Averia Gruesa Libre');
  text("Robert H. Treman State Park, Upper Falls ", windowWidth/2, windowHeight /2 + BUFF_HEIGHT / 2 + 32)

  buff.fill("#F2F2E1");
  buff.rect(0, 0, BUFF_WIDTH, BUFF_HEIGHT, 5);
  buff.image(waterIMG, 0, 0)
  buff.image(trailIMG, 0, 0)

  let targetY = mouseY;
  let dy = targetY - mouseYSmoothed;
  mouseYSmoothed += dy * easingPos;

  let targetX = mouseX;
  let dx = targetX - mouseXSmoothed;
  mouseXSmoothed += dx * easingPos;

  let perc = 1 - (mouseYSmoothed - 150) / BUFF_HEIGHT;
  let distance = trailTotalLength * perc;
  let loc = trailPath.getPointAtLength(distance);

  let headAngle = getHeadAngle();
  
  buff.fill("#607A79");
  buff.ellipse(loc.x, loc.y, 5, 5);
  buff.translate(loc.x, loc.y);
  buff.rotate(radians(headAngle))
  
  buff.imageMode(CENTER);
  buff.image(cursorIMG, 0, -58);
  buff.imageMode(CORNER);

  buff.rotate(-radians(headAngle))
  buff.translate(-loc.x, -loc.y);

  buff.fill("#00AAB515");
  buff.ellipse(mouseXSmoothed - windowWidth / 2 + BUFF_WIDTH / 2, mouseYSmoothed - windowHeight / 2 + BUFF_HEIGHT / 2, 25, 25);

  // draw the buffer
  image(buff, width / 2 - BUFF_WIDTH / 2, height / 2 - BUFF_HEIGHT / 2, BUFF_WIDTH, BUFF_HEIGHT);
  
  // update audio and draw points if enabled
  soundSourceArray.update();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
