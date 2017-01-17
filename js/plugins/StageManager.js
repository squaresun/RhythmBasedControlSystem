//=============================================================================
// StageManager.js
// Published by: Squaresun
//=============================================================================

/*:
* @plugindesc Controls the stage initialize and finalize.
*
* @param Start Count Down Time
* @desc The time count down before the game start (in ms). Default = 3000.
* @default 3000
*
* @param Song Name
* @desc The file name of the song; background music.
* @default Dungeon1
* 
*
* @param Global Offset
* @desc The offset of judge.
* @default 0
*
* @ No other settings required.
*/

var $stage = null;      //The global object stores the current stage manager

//StageManager class
function StageManager(){
    var parameters = PluginManager.parameters("StageManager");

    this.startCountDownTime = Number(parameters['Start Count Down Time'] || 3000);
    var songName = String(parameters['Song Name']);
    
    this.bgmAudio = new Audio('audio/bgm/'+songName+'.ogg');    //Use HTML audio object
    
    this.globalOffset = Number(parameters['Global Offset'] || 0);
    
    $stage = this;
}

////////////////////////////////////////////////////////////////////////////////////////////
//You may use ....
StageManager.prototype.startCountDown = function(){
    setTimeout(this.start.bind(this), this.startCountDownTime);
}

StageManager.prototype.finalize = function(){
    this.bgmAudio.pause();
    this.bgmAudio.currentTime = 0;
    $gamePlayer.finalize();
    $gameMap.finalize();
}

////////////////////////////////////////////////////////////////////////////////////////////
StageManager.prototype.start = function(){
    $stage = this;  //Refresh $stage
    if(this.bgmAudio.currentTime > 0){
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
    }
    $gamePlayer.judge.startStopWatch();
    this.bgmAudio.play();
    this.initAll();
}

StageManager.prototype.initAll = function(){
    $gamePlayer.init();
    $gameMap.init();
}

function Music(name, volume, pitch, pan){
    this.name = name;
    this.volume = volume;
    this.pitch = pitch;
    this.pan = pan;
}