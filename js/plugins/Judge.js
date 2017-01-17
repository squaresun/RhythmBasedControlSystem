//=============================================================================
// Judge.js
// Published by: Squaresun
//=============================================================================

/*:
* @plugindesc The judgement system on player.
*
* @param Song Offset
* @desc The offset of the song. Default = 0.
* @default 0
*
* @param Song BPM
* @desc The BPM of the song. Default = 150.
* @default 150
* 
* @param Bar divisor
* @desc The number of beats in each bar. Default = 4.
* @default 4
*
* @param Perfect timing cutoff
* @desc The ending time of Perfect (in ms). Default = 100.
* @default 100
*
* @param Miss timing cutoff
* @desc The starting time of Miss (in ms). Default = 150.
* @default 150
*
* @param Checkout maximum bars count
* @desc The next n beats can be eliminated by checkout. The minimum is 1.
* @default 2
*
* @param Event Action Invoker size
* @desc Event Action Invoker size
* @default 1
*
* @ No other settings required.
*/

var Judge_eventActionInvokerArrSize = 1;

//The stopwatch class
var Stopwatch = function() {
    // Private vars
    var startAt = 0;  // Time of last start / resume. (0 if not running)
    var lapTime = 0;  // Time on the clock when last stopped in milliseconds

    var now = function() {
            return (new Date()).getTime(); 
        }; 

    // Public methods
    // Start or resume
    this.start = function() {
            startAt = startAt ? startAt : now();
        };

    // Stop or pause
    this.stop = function() {
            // If running, update elapsed time otherwise keep it
            lapTime = startAt ? lapTime + now() - startAt : lapTime;
            startAt = 0; // Paused
        };

    // Reset
    this.reset = function() {
            lapTime = startAt = 0;
        };

    // Duration
    this.time = function() {
            return lapTime + (startAt ? now() - startAt : 0); 
        };
};

//The Judge class
function Judge(){
    var parameters = PluginManager.parameters("Judge");

    var offset = Number(parameters['Song Offset'] || 0);
    var bpm = Number(parameters['Song BPM'] || 150);
    var barDivisor = Number(parameters['Bar divisor'] || 4);
    var perfectCutoff = Number(parameters['Perfect timing cutoff'] || 100);
    var missCutoff = Number(parameters['Miss timing cutoff'] || 150);
    var checkoutCutOff = Number(parameters['Checkout timing cutoff'] || 150);
    var checkoutMaximumCount = Number(parameters['Checkout maximum bars count'] || 2);
    
    this.offset = offset;
    this.bpm = bpm;
    this.beatInterval = 60.0 / bpm * 1000.0 * 4.0 / barDivisor;
    this.BarInterval = 60.0 / bpm * 1000.0 * 4.0;
    this.perfectCutoff = perfectCutoff;
    this.missCutoff = missCutoff;
    this.checkoutMaximumCount = Math.max(checkoutMaximumCount, 1);
    Judge_eventActionInvokerArrSize = Number(parameters['Event Action Invoker size'] || 1);
    
    this.refreshMembers();
};

//Refresh all members in judge
Judge.prototype.refreshMembers = function(){
    this.lastScore = 1.0;
    this.nextBeatIndex = 1;
    this.stopWatch = new Stopwatch();
    
    //For events on map update with beats
    this.beatEventListener = [];
    
    //Event action invokers
    this.eventActionInvokerArr = [];
    for(var i = 0;i<Judge_eventActionInvokerArrSize;i++){
        this.eventActionInvokerArr.push(new EventActionInvoker());
    }
    
    this.missChecker;
}

//Start the judge measurement
Judge.prototype.startStopWatch = function(){
    this.stopWatch.reset();
    this.stopWatch.start();
    this.missChecker = setTimeout(this.missCheck.bind(this), this.offset + this.missCutoff);
    if(this.eventActionInvokerArr.length > 0){
        this.eventActionInvokerArr[0].start();
    }
}

Judge.prototype.curTime = function(){
    return this.stopWatch.time() + this.offset + $stage.globalOffset;
}

//return 0~1 ranged result; also, clamp01
//NO nextBeatIndex INCREMENT
Judge.prototype.measure = function(){
    if(this.curBeatIndex() < this.nextBeatIndex){
        return 1.0;
    }
    var deviatedTime = this.curTime() % this.beatInterval;
    //Flipping deviated time
    deviatedTime = Math.min(this.beatInterval - deviatedTime, deviatedTime);
    return Math.min(Math.max(1/(this.missCutoff - this.perfectCutoff) * deviatedTime - (this.perfectCutoff/(this.missCutoff - this.perfectCutoff)), 0.0), 1.0);
};

//Return the current beat index the stopwatch locating
Judge.prototype.curBeatIndex = function(){
    var curTime = this.curTime();
    curTime += (this.beatInterval / 2.0);
    return parseInt(curTime / this.beatInterval);
};

//Is eliminating next beat needed?
Judge.prototype.afterCheckoutCutoff = function(){
    return this.checkoutMaximumCount + this.curBeatIndex() > this.nextBeatIndex;
}

//return the measurement result and eliminate beat if stopwatch located after the checkout region
Judge.prototype.checkout = function(){
    var result = this.measure();
    if(this.afterCheckoutCutoff()){
        this.callAllEventListener();
        this.eliminateCurBeat();
        this.lastScore = result;
    }
    return result;
};

//eliminate beat
Judge.prototype.eliminateCurBeat = function(){
    this.nextBeatIndex++;
    $gameMap.UI.updateNotesIndex(); //Tells the UI Manager to update to next beat
}

//Unit : second
Judge.prototype.getDeltaTime = function(index){
    return Math.max((parseFloat(index) * this.beatInterval - this.curTime()), 0);
}

//Here calls all the event listener bound on player input (checkout)
Judge.prototype.callAllEventListener = function(){
    var thisObj = this;
    this.beatEventListener.forEach(function(element){
        element();
    });
}

//Don't forget to bind "this"
Judge.prototype.attachBeatEventListener = function(f){
    this.beatEventListener.push(f);
    return this.beatEventListener[this.beatEventListener.length - 1];
}

//CHANGE THE METHOD OF DETACH
Judge.prototype.detachBeatEventListener = function(listener){
    if(listener !== undefined && listener != null){
        var index = this.beatEventListener.indexOf(listener);
        if(index > -1){
            this.beatEventListener.splice(index, 1);
        }
    }
}

//Checkout if player miss the beat
Judge.prototype.missCheck = function(){
    if(this.curBeatIndex() > this.nextBeatIndex){
        this.checkout();    //Missed
    }
    var curDeltaTime = (this.curTime() + this.missCutoff) % this.beatInterval;
    if(curDeltaTime > this.beatInterval / 2.0){
        curDeltaTime -= this.beatInterval;
    }
    this.missChecker = setTimeout(this.missCheck.bind(this), this.beatInterval - curDeltaTime);
}

//Please don't use this directly; Use $stage.finalize() instead
Judge.prototype.finalize = function(){
    clearTimeout(this.missChecker);
    this.eventActionInvokerArr.forEach(function(element){
        element.stop();
    });
    this.refreshMembers();
}

function EventActionInvoker(){
    this.actionSlotArr = [];
    
    this.curActionIndex = 0;
    this.curBeatIndex = 0;
    
    this.curPlayerJudgeBarIndex = 0;
    
    this.ready = false;
    this.updater = null;
}

//To start this object
EventActionInvoker.prototype.start = function(){
    var msDelta = $gamePlayer.judge.curTime() % $gamePlayer.judge.beatInterval;
    if(msDelta > $gamePlayer.judge.beatInterval / 2.0){
        msDelta -= $gamePlayer.judge.beatInterval;
    }
    var globalStopwatchBarOffset = parseFloat(msDelta) / $gamePlayer.judge.BarInterval;
    this.curPlayerJudgeBarIndex = Math.floor($gamePlayer.judge.curTime() / $gamePlayer.judge.BarInterval);
    //Starting the update function
    if(this.actionSlotArr.length > 0){
        this.updater = setTimeout(this.updateAction.bind(this), Math.max((this.actionSlotArr[this.curActionIndex].time - globalStopwatchBarOffset) * $gamePlayer.judge.BarInterval, 0));
    }
    else{
        this.stop();
    }
    this.ready = true;
    
    
}

EventActionInvoker.prototype.reset = function(){
    this.curActionIndex = 0;
    if(this.updater != null){
        clearTimeout(this.updater);
        this.updater = null;
    }
    this.ready = false;
}

EventActionInvoker.prototype.stop = function(){
    this.reset();
}

EventActionInvoker.prototype.addActions = function(timeArr, actionArr){
    var isEmptyActionArrBefore = this.actionSlotArr.length == 0;
    
    var totalBars = Math.floor(timeArr[timeArr.length - 1]) + 1;
    var thisObj = this;
    while(timeArr.length > actionArr.length){
        actionArr.push(actionArr[actionArr.length - 1]);
    }
    timeArr.forEach(function(element, index, array){
        var curIndex = 0;
        var curTime = element % 1.0;
        while(curIndex < thisObj.actionSlotArr.length && thisObj.actionSlotArr[curIndex].time<curTime){
            curIndex++;
        }
        if(curIndex < thisObj.actionSlotArr.length && thisObj.actionSlotArr[curIndex].time == curTime){
            thisObj.actionSlotArr[curIndex].pushAction(actionArr[index], Math.floor(element), totalBars);
        }else{
            thisObj.actionSlotArr.splice(curIndex, 0, new EventActionSlot(curTime, actionArr[index], Math.floor(element), totalBars));
        }
    });
    if(isEmptyActionArrBefore && this.ready){
        this.reset();
        this.start();
    }
}

EventActionInvoker.prototype.updateAction = function(){
    //Doing next action
    this.actionSlotArr[this.curActionIndex].action(this.curBeatIndex);
    
    //Set timeout
    this.curActionIndex = (this.curActionIndex + 1) % this.actionSlotArr.length;
    if(this.curActionIndex == 0){
        this.curBeatIndex++;
        this.curPlayerJudgeBarIndex++;
    }
    var nextDeltaTime = (this.actionSlotArr[this.curActionIndex].time + (this.curPlayerJudgeBarIndex - Math.floor($gamePlayer.judge.curTime() / $gamePlayer.judge.BarInterval))) * $gamePlayer.judge.BarInterval - ($gamePlayer.judge.curTime() % $gamePlayer.judge.BarInterval);
    
    this.updater = setTimeout(this.updateAction.bind(this), nextDeltaTime);
}

function EventActionSlot(time, actionFunc, barIndex, totalBars){
    this.time = time;
    this.actionArr = [new EventAction(actionFunc, barIndex, totalBars)];
}

EventActionSlot.prototype.action = function(curIndex){
    this.actionArr.forEach(function(element, index, array){
        element.action(curIndex);
    });
}

EventActionSlot.prototype.pushAction = function(actionFunc, barIndex, totalBars){
    this.actionArr.push(new EventAction(actionFunc, barIndex, totalBars));
}

function EventAction(actionFunc, barIndex, totalBars){
    this.actionFunc = actionFunc;
    this.barIndex = barIndex;
    this.totalBars = totalBars;
    this.action = function(curIndex){
        (curIndex % this.totalBars) == this.barIndex && this.actionFunc();
    }
}

//1. binding Judge object on Game_Player
//2. modifying the movement function
(function (originalFunc) {
    Game_Player.prototype.initialize = function(){
        this.judge = new Judge();
        originalFunc.call(this);
        this.originalMoveFunction = this.moveByInput;
        this.moveByInput = this.waitForInit;
    };
}(Game_Player.prototype.initialize));


//1. binding the StageManager and UIManager object on Game_Map
//2. modifying the update function
(function(originalFunc){
    Game_Map.prototype.initialize = function(){
        originalFunc.call(this);
        this.stageManager = new StageManager();
        this.UI = new UIManager();
        this.originalUpdate = this.update;
        this.updateBeforeInit = this.update;
    };
}(Game_Map.prototype.initialize));



(function(){
    //Game Map
    Game_Map.prototype.init = function(){
        this.update = this.updateAfterStarted;
        this.UI.init();
        this.isStarted = true;
    };
    Game_Map.prototype.finalize = function(){
        this.UI.finalize();
        this.isStarted = false;
        this.update = this.updateBeforeInit;
    };
    //Game Map update the UI Notes
    Game_Map.prototype.updateAfterStarted = function(sceneActive){
        this.originalUpdate.call(this, sceneActive);
        this.UI.Update();
    };
    
    //Game Player
    Game_Player.prototype.init = function(){
        this._moveSpeed = 5.5;              //Move fast
        this.moveByInput = this.moveByWalking;
    };

    Game_Player.prototype.finalize = function(){
        this.judge.finalize();
        this.moveByInput = function(){};
    };
    
    //check if the player is pressing the button
    Game_Player.prototype.isInputing = function (){
        return this.getInputDirection() != 0;
    };

    Game_Player.prototype.moveByWalking = function(){
        if(this.isInputing()){
            //DONT USE AFTERCHECKOUTCUTOFF AFTER CHECKOUT
            if(this.judge.afterCheckoutCutoff() && this.judge.checkout() < 1){
                this.originalMoveFunction();
            }
            this.moveByInput = this.ignoreMoveInput;
        }
    };
    
    Game_Player.prototype.ignoreMoveInput = function(){
        if(!this.isInputing()){
            this.moveByInput = this.moveByWalking;
        }
    };

    Game_Player.prototype.waitForInit = function(){

    };
}());