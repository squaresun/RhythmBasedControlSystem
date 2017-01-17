//=============================================================================
// UIManager.js
// Published by: Squaresun
//=============================================================================

/*:
* @plugindesc The UI system on player.
*
* @param Pool size
* @desc The maximum count of notes display on the UI. Default = 5
* @default 5
*
* @param Note Speed
* @desc The Speed of Note. In Range [1, 100]. Default = 30
* @default 30
* 
* @ No other settings required.
*/

var UI_poolSize, UI_speed;
function UINote(index, whichSide){
    this.index = index;
    this.pictureId = index + 1;
    this.width = 408;
    if(whichSide == "Left"){
        this.updater = this.updateLeft;
    }else{
        this.updater = this.updateRight;
    }
}

UINote.prototype.updateLeft = function(){
    $gameScreen._pictures[this.pictureId]._x=this.width * (1.0 - (parseFloat($gamePlayer.judge.getDeltaTime(this.index)) / parseFloat($gamePlayer.judge.beatInterval)) * UI_speed);
}

UINote.prototype.updateRight = function(){
    $gameScreen._pictures[this.pictureId+UI_poolSize]._x=this.width + this.width * (parseFloat($gamePlayer.judge.getDeltaTime(this.index)) / parseFloat($gamePlayer.judge.beatInterval)) * UI_speed;
}

function UINotes(){
    this.lastBeatIndex = 1;     //Current beat index in judge
    this.headNoteIndex = 0;     //Index of which note object is closest to the HEART
    this.notesLeft = [];//list of note objects
    this.notesRight=[];

    for(var i = 0;i<UI_poolSize;i++){
        $gameScreen.showPicture(i+2,"UI",1, -100,600,100,100,255,0);    //Create note's picture
        $gameScreen.showPicture(i+2+UI_poolSize,"UI",1,916,600,100,100,255,0);
        this.notesLeft.push(new UINote(i+1,"Left"));                        //Push back note objects to note array
        this.notesRight.push(new UINote(i+1,"Right"));
    }
}

UINotes.prototype.updateAllNotes = function(){
    this.notesLeft.forEach(function(element, index, array){
        element.updater();   //Update all notes' position
    });
      this.notesRight.forEach(function(element, index, array){
        element.updater();   //Update all notes' position
    });
}

//Next beat reached
UINotes.prototype.updateNotesIndex = function(){
    this.notesLeft[this.headNoteIndex].index += UI_poolSize;        //place the first note to the back
    this.notesRight[this.headNoteIndex].index += UI_poolSize;
    this.headNoteIndex = (this.headNoteIndex + 1) % UI_poolSize;    //Update index of head note
    this.lastBeatIndex = $gamePlayer.judge.nextBeatIndex;            //Update to judge's current beat index
}

function UIManager (){    
    var parameters = PluginManager.parameters("UIManager");

    UI_poolSize = Number(parameters['Pool size'] || 5);
    UI_speed = Number(parameters['Note Speed'] || 30) / 100.0;
    
    this.Update = function(){};
}

UIManager.prototype.init = function(){
    this.CreatHeart();
    this.uiNotes = new UINotes();
    this.Update = this.updateAfterInit;
}

UIManager.prototype.CreatHeart =function(){
    var scaling = ($gamePlayer.judge.missCutoff / $gamePlayer.judge.beatInterval)*(408.0 * UI_speed / 64.0) * 100.0;
    $gameScreen.showPicture(1,"heart",1,408,600,scaling,scaling,255,0);
}

UIManager.prototype.updateAfterInit =function(){
    this.uiNotes.updateAllNotes();  //update all notes' positions
}

UIManager.prototype.updateNotesIndex = function(){
    this.uiNotes.updateNotesIndex();
}

UIManager.prototype.finalize = function(){
    this.Update = function(){};
}