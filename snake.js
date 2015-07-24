var globalScope;

(function (scope) {
  'use strict';

  var frame_counter = 0; //used in countdown method to ration out calls to draw()
  var max_frame_count = 4; //number of frames in between draw
  var grid_gap = 20; //size of grid grid_gap.
  var max_x;
  var max_y;

  var grid;
  var snake;
  var score;

  //Segment Class

  var Segment = function(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
  };

  Segment.prototype.draw = function() {
    drawRect(this.x, this.y, Segment.styles[this.type]);
  };

  //Static member which maps segment type to a fill style
  Segment.styles = {
    "snake": "white",
    "food": "blue",
    "obstacle": "red"
  };

  var segmentFactory = function(segment, direction, type) {
    return new Segment(segment.x + direction.x, segment.y + direction.y, type);
  };

  //Grid Class

  var Grid = function() {
    this.registry = {};
    this.typeCount = {};
  };

  Grid.prototype.generateObject = function(type) {
    var x;
    var y;
    do {
      x = Math.floor(Math.random()*max_x);
      y = Math.floor(Math.random()*max_y);
    } while(this.registry['x' + x + 'y' + y]);
    this.add(new Segment(x,y,type));
  };

  Grid.prototype.generateHash = function(segment) {
    return 'x' + segment.x + 'y' + segment.y;
  };

  Grid.prototype.get = function(segment) {
    return this.registry[this.generateHash(segment)];
  };

  Grid.prototype.add = function(segment) {
    if(this.registry[this.generateHash(segment)]) {
      throw "Collision at (" + segment.x + "," + segment.y + ").";
    }
    if(this.typeCount[segment.type]) {
      this.typeCount[segment.type]++;
    } else {
      this.typeCount[segment.type] = 1;
    }
    this.registry[this.generateHash(segment)] = segment;
  };

  Grid.prototype.remove = function(segment) {
    this.typeCount[segment.type]--;
    delete this.registry[this.generateHash(segment)];
  };

  Grid.prototype.draw = function() {
    var l = this.registry;
    Object.keys(l).map(function(k) {
      l[k].draw();
    });
  };

  //Upkeep the game grid
  Grid.prototype.update = function() {
    if(!this.typeCount.food) {
      this.generateObject('food');
    }
    if(score > 200*(this.typeCount.obstacle || 0)) {
      this.generateObject('obstacle');
    }
    if(max_frame_count * score > 4000) {
      max_frame_count = Math.max(1, max_frame_count-1);
    }
  };

  //Snake Class

  var Snake = function(grid) {
    var self = this;

    self.grid = grid;
    self.segments = [];
    self.direction = null;
    self.canChangeDirection = true; // Our "debouncer"
    self.segments.push(new Segment(4, 4, "snake"));

    self.segments.map(function(segment) {
      self.grid.add(segment);
    });

    self.listener = function(e) {
      if(self.canChangeDirection) {
        switch(e.which) {
          case 37: // left
            if (self.direction !== Snake.direction.Right) {
              self.direction = Snake.direction.Left;
              self.canChangeDirection = false;
            }
            break;

          case 38: // up
            if (self.direction !== Snake.direction.Down) {
              self.direction = Snake.direction.Up;
              self.canChangeDirection = false;
            }
            break;

          case 39: // right
            if (self.direction !== Snake.direction.Left) {
              self.direction = Snake.direction.Right;
              self.canChangeDirection = false;
            }
            break;

          case 40: // down
            if (self.direction !== Snake.direction.Up) {
              self.direction = Snake.direction.Down;
              self.canChangeDirection = false;
            }
            break;

          default:
            return; // exit self handler for other keys
        }
      }
      e.preventDefault(); // prevent the default action (scroll / move caret)
    };

    //Set up keyboard listener. Probably will make it easy to extend this later (different keycodes change mapping)
    document.addEventListener("keydown", self.listener, false);
  };

  Snake.prototype.update = function () {
    if(!this.direction) {
      return;
    }

    this.canChangeDirection = true;

    var newSeg = segmentFactory(this.segments[this.segments.length-1], this.direction, "snake");
    var oldSeg = this.segments.shift();

    var inGrid = grid.get(newSeg);
    if (inGrid && inGrid.type === "food") { //We're eating food!
      this.segments.unshift(oldSeg); //Put it back
      this.grid.remove(inGrid);
      score += 100;
    } else {
      this.grid.remove(oldSeg);
    }

    this.grid.add(newSeg);
    this.segments.push(newSeg);
  };

  Snake.prototype.destroy = function() {
    document.removeEventListener("keydown", this.listener);
  };

  Snake.direction = {
    Left: {x: -1, y: 0},
    Up: {x: 0, y: -1},
    Right: {x: 1, y: 0},
    Down: {x: 0, y: 1},
  };

  var getContext = function() {
    return document.getElementById("board").getContext("2d");
  };

  var draw = function() {
    var ctx = getContext();
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    max_x = ctx.canvas.width/grid_gap;
    max_y = ctx.canvas.height/grid_gap;

    snake.update();
    grid.update();

    grid.draw();


    ctx.font = "48px serif";
    ctx.strokeStyle = "white";
    ctx.textAlign = "center";
    ctx.strokeText(score.toString(), ctx.canvas.width/2, 50);

  };

  var drawRect = function(x, y, style) {
      if (x < 0 || x >= max_x || y < 0 || y >= max_y) {
        throw new Error("Coordinates (" + x + "," + y + ") are out of bounds!");
      }
      var ctx = getContext();
      ctx.save();
      ctx.fillStyle = style;
      ctx.fillRect(x*grid_gap, y*grid_gap, grid_gap, grid_gap);
      ctx.restore();
  };

  function count() {
    if (frame_counter === 0) {
      try {
        draw();
      } catch (e) {
        console.log("End game!");
        snake.destroy();
        snake = null;
        grid = null;
        instantiate();
        return;
      }
      frame_counter = max_frame_count;
    }
    else {
      frame_counter--;
    }

    requestAnimationFrame(count);
  }

  function instantiate() {
    frame_counter = 0;
    max_frame_count = 4;
    grid_gap = 20;

    grid = new Grid();
    snake = new Snake(grid);
    score = 0;

    count();
  }

  requestAnimationFrame(instantiate);
})(globalScope || (globalScope = {}));
