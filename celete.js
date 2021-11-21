class PlayingCharacterFramework{
    /**
     * Class to move a HTML element to simulate moving a character
     * @constructor
     * @param {HTMLElement} player_html_element HTMLElement that will move as a player
     * @param {Number} gravity_constant gravity constant
     * @param {Number} y_max maximum vertical speed in pixel/s
     * @param {Number} x_max maximum horizontal speed in pixels/s
     * @param {Number} acceleration_constant horizontal acceleration constant
     * @param {Number} decceleration_constant horizontal decceleration constant
     * @param {Number} jump_constant
     * @param {Number} dt time between frames
     * @param {Object} keys takes object with the required keys:
     * up down left right dash climb
     * 
     * values should be .code equailivant
     * @param {String} collision_class class name of elements that player can not move through
     */
    constructor(player_html_element, gravity_constant, y_max, x_max, acceleration_constant, decceleration_constant, jump_constant, dt, keys, collision_class){
        this.player = player_html_element;
        this.GCONST = gravity_constant;
        this.Y_MAX = y_max;
        this.X_MAX = x_max;
        this.ACONST = acceleration_constant;
        this.DCONST = decceleration_constant;
        this.keys = keys;
        this.JCONST = jump_constant;

        this.allowInput = true;
        this.frozenMotion = false;

        this.motionTimer;
        this.keysPressed = [];

        let style = window.getComputedStyle(this.player);

        this.left = parseFloat(style.getPropertyValue('left'));
        this.top = parseFloat(style.getPropertyValue('top'));
        this.width = parseFloat(style.getPropertyValue('width'));
        this.height = parseFloat(style.getPropertyValue('height'));

        // check collision function
        // this.partionW = partion[0];
        // this.partionH = partion[1];

        this.col_class = collision_class;

        this.climbing = false;
        this.touchingGround = false;
        this.dashAllow = true;
        this.touchingCeiling = false;

        this.xVel = 0;
        this.yVel = 0;

        this.dt = dt;
    }
    /**
     * adds listeners for key presses to allow movement
     */
    initiate(){
        let self = this;

        document.addEventListener('keydown', function(event){self.addKey(event.code)});
        document.addEventListener('keyup', function(event){self.removeKey(event.code)});
    }
    /**
     * Adds keys to this object's array of keys being pressed
     * O(n) time
     * @param {String} keyCode key to be added
     */
    addKey(keyCode){
        if(this.keysPressed.indexOf(keyCode) == -1){

            // add key to array
            this.keysPressed.push(keyCode);
        }
    }
    /**
     * Removes keys to this object's array of keys being pressed
     * O(n) time
     * @param {String} keyCode key to be removed
     */
    removeKey(keyCode){
        
        // if there is some tricky way to release a key without pressing it, indexOf should return -1
        // and we'll then ignore it
        // update: will use this when trying to do null movement
        if(this.keysPressed.indexOf(keyCode) != -1){

            // delete key from array
            this.keysPressed.splice(this.keysPressed.indexOf(keyCode), 1);
        }
    }
    /**
     * Updates the player's x position in one frame
     */
    updateX(){
        // going to have to abuse shortcircuit a lot to optimise ig
        if(this.keysPressed.indexOf(this.keys['right']) >= 0 && this.keysPressed.indexOf(this.keys['left']) < 0){

            // test collision first, then do calcs later
            // if(!collideX)
            // if the player has not reached full speed
            if(Math.abs(this.xVel) < this.X_MAX){

                // time formula but time is to simplify for now
                this.left += this.xVel * this.dt + (1/6) * this.ACONST * Math.pow(this.dt, 3);
                this.xVel += 0.5 * this.ACONST * Math.pow(this.dt, 2);
            } else {
                // constant velocity
                this.xVel = this.X_MAX;
                this.left += this.xVel;
            }
        } 
        if(this.keysPressed.indexOf(this.keys['left']) >= 0 && this.keysPressed.indexOf(this.keys['right']) < 0){

            // test collision first, then do calcs later
            // if(!collideX)
            // if the player has not reached full speed
            if(Math.abs(this.xVel) < this.X_MAX){

                // time formula but time is to simplify for now
                
                this.left += this.xVel * this.dt - (1/6) * this.ACONST * Math.pow(this.dt, 3);
                this.xVel -= 0.5 * this.ACONST * Math.pow(this.dt, 2);

            } else {
                // constant velocity
                this.xVel = -this.X_MAX;
                this.left += this.xVel;
            }
        }
        // if both keys are pressed, tend towards 0 xVel
        // otherwise, while the player will not move because math calculations cancel out,
        // the current speed is still being held
        // also save calculations by requiring the previous key tests 

        // update: realised that we can combine the decceleration function with the cancellation function
        // update: changed if statement
        // if neither keys are pressed and player is still moving
        if(Math.abs(this.xVel) > 0 && (this.keysPressed.indexOf(this.keys['right']) < 0 == this.keysPressed.indexOf(this.keys['left']) < 0)){

            // start to deccelerate ig

            // going to the right
            if(this.xVel > 0){
                this.left += this.xVel * this.dt - (1/6) * this.DCONST * Math.pow(this.dt, 3);
                
                // set velocity to 0 if reaching 0, else don't 

                // skip a head a frame earlier to stop (we can avoid this by using more variables, but save memory for now, should
                // be unnoticable

                if(this.xVel - this.DCONST <= 0){
                    this.xVel = 0;
                } else {
                    this.xVel -= 0.5 * this.DCONST * Math.pow(this.dt, 2);
                }
            } 
            // going to the left
            else {
                this.left += this.xVel * this.dt + (1/6) * this.DCONST * Math.pow(this.dt, 3);

                if(this.xVel + this.DCONST >= 0){
                    this.xVel = 0;
                } else {
                    this.xVel += 0.5 * this.DCONST * Math.pow(this.dt, 2);
                }
            }
        }

        // check if the player will hit something
        let hits = this.broadCollision();
        if(hits[0] != -1){ this.left = hits[0]; this.xVel = 0; };
        // update the location
        this.player.style.left = Math.floor(this.left) + "px";
    }
    updateY(){
        // jump
        if(this.keysPressed.indexOf(this.keys['up']) >= 0 && this.touchingGround){
            this.yVel -= this.JCONST;
            this.touchingGround = false;
        }
        // simulate gravity
        this.top += this.yVel * this.dt + 0.5 * this.GCONST * Math.pow(this.dt, 2);

        if(this.yVel + this.GCONST >= this.Y_MAX){
            this.yVel = this.Y_MAX;
        } else {
            this.yVel += this.GCONST;
        }

        // if player is falling, then player is not touching the ground
        if(this.yVel > 0){
            this.touchingGround = false;
        }

        // check if the player will hit something
        let hits = this.broadCollision();
        if(hits[1] != -1){ this.top = hits[1]; this.yVel = 0; if(!this.touchingCeiling){this.touchingGround = true}};
        // update the location
        this.player.style.top = Math.floor(this.top) + "px";

    }
    // Partion system but probably inefficient since only thing needs to be checked with collision: the player
    // instead of multiple particles

    // /**
    //  * Move the collision partion to the player's center
    //  */
    // relocatePartion(){
    //     let pcenter = [this.left+this.width/2, this.top + this.height/2];
    //     this.partion.style.left = pcenter[0] - this.pwidth/2;
    //     this.partion.style.top = pcenter[0] - this.pheight/2;
    // }
    // /**
    //  * Applies singular collision check to a
    //  * This is assumign that getComputedStyle is expensive
    //  * @returns array of coords of the surface(s) that the player is touching
    //  */
    broadCollision(){
        let checkElems = document.getElementsByClassName('ground');
        let hits = [-1, -1]
        for(let i = 0; i < checkElems.length; ++i){
            let coords = this.narrowCollision(checkElems[i]);
            let left = coords[0];
            let top = coords[1];
            if(left != -1) hits[0] = left;
            if(top != -1) {hits[1] = top;};
        }
        return hits;
    }
    /**
     * singular collision detection in the x direction
     * @param {HTMLElement} object HTMLElement of the surface to check collision
     * since camera can change position, we can have to recalculate position everytime
     * higher numbers will look glitchly as if the player gets stuck to the object, lower numbers might cause player to glitch beyond the collision before resetting
     * 
     * currently no support for precise corner collisions
     * @returns array of left and top position of surface that the player is touching, will return -1 if no collision
     */
    narrowCollision(object){
        let style = window.getComputedStyle(object);

        let left = parseInt(style.getPropertyValue('left'));
        let right = left + parseInt(style.getPropertyValue('width'));
        let top = parseInt(style.getPropertyValue('top'));
        let bottom = top + parseInt(style.getPropertyValue('height'));

        // using opposite logic, if the player is not either to the right or left the object, then it is touching the object
        // same for vertical, but as mental exercise, we can view it as the players' top surpassing the bottom
        // but the player's bottom not yet surpassing the top
        let leftright = !(this.left >= right || this.left + this.width <= left);
        let topbottom = (this.top < bottom && this.top + this.height > top);
        //let topbottom = !(this.top > bottom || this.top + this.height < top);
        
        if(leftright && topbottom){
            let collisionLeft = -1;
            let collisionTop = -1;
            // approached from the top, so both the top and bottom of the colliding element are below the player
            if(this.top <= bottom && this.top <= top){
                collisionTop = top - this.height;
                this.touchingCeiling = false;
            // otherwise:
            } 
            else //(this.top + this.height >= bottom && this.top + this.height >= top){
            {
                collisionTop = bottom;
                this.touchingCeiling = true;
            }
            // approached from the left, so both the right and left of the collding element are to the right of the player
            if(this.left <= right && this.left <= left){
                collisionLeft = left - this.width;

                // then the collision was intended 
            // otherwise:
            } 
            else {
                collisionLeft = right;
            }
            return [collisionLeft, collisionTop];
        } else {
            return [-1, -1];
        }
    }

    /**
     * debugging tool
     */
    debugLog(velInfo, keyInfo){
        if(velInfo){
            console.log("Horizontal Speed: " + this.xVel);
            console.log("Vertical Speed:" + this.yVel);
        }
        if(keyInfo){
            console.log("Keys Pressed: " + this.keysPressed);
        }
    }
}

class FrameRenderConsistent{
    /**
     * Combines all operations that will be carried out every frame
     * @constructor
     * @param {Number} FPS frames per second
     */
    constructor(FPS){
        this.FPS = FPS;
        this.operations = [];
        this.mainTimer;
    }
    /**
     * add function that will be executed at given FPS to list of functions being executed
     * @param {Function} func function that will be executed at given FPS
     */
    addOperation(func){
        this.operations.push(func);
    }
    /**
     * helper function to aggregate all functions into one
     */
    doFunc(){
        for(let i = 0; i < this.operations.length; ++i){
            this.operations[i]();
        }
    }
    /**
     * start rendering
     */
    startRender(){
        let self = this;

        // at N FPS, we want to update N times per 1000 ms, so update every 1000/N times
        this.mainTimer = setInterval(function(){self.doFunc()}, 1000/self.FPS)
    }
    /**
     * stop rendering
     */
    stopRender(){
        clearInterval(this.mainTimer);
    }
}

let keys = {
    right: "KeyD",
    left: "KeyA",
    up: "KeyW",
}

function main(){
    // creating our madeline
    let madelineRef = document.getElementById('madeline');
    let madeline = new PlayingCharacterFramework(madelineRef, 1, 100, 8, 4, 6, 22, 0.75, keys, 'ground');
    madeline.initiate();

    let gameRender = new FrameRenderConsistent(60);
    gameRender.addOperation(function(){madeline.updateX()});
    gameRender.addOperation(function(){madeline.updateY()});
    gameRender.startRender();
}
window.onload = function(){main()}