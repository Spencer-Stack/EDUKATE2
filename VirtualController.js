class VirtualController {
    constructor(visual_controller) {
        this.visual_controller = visual_controller;
        this.grid_n = 0;
        this.grid_container = $("#grid_house");
        this.active_grid = [];
        this.levels = [];
        this.cur_level = null; // this stuff will eventually be loaded from localStorage
        this.cur_level_index = 0;

        this.baby_x = null;
        this.baby_y = null;

        // Use .then to execute code after the data is ready
        this.initialiseLevels().then(() => {
            this.changeColumns();
            this.setGridContainer(this.default_grid);
            this.active_grid = this.default_grid.map(tile => new VirtualTile(tile.index, tile.tile_type.name));
            this.drawBaby();
        });
    }

    changeColumns() {
        $(':root').css('--tile_cols', this.grid_n);
    }

    getCurLevel(){
        let account = this.visual_controller.account_controller.loadAccountData();
        if (account == null){
            this.cur_level_index = 0;
            return this.levels[0];
        } else{
            this.cur_level_index = parseInt(account['level']) - 1;
            return this.levels[this.cur_level_index];
        }
    }

    initialiseLevels() {
        // Return a new Promise
        return new Promise(async (resolve, reject) => {
            try {
                let level_1 = await Level.create(1, 0, 1); // Await the Promise returned by Level.create
                let level_2 = await Level.create(2, 0, 2);
                let level_3 = await Level.create(3, 0, 0);
                let level_4 = await Level.create(4, 0, 0);
                this.levels = [level_1, level_2, level_3, level_4];
                this.cur_level = this.getCurLevel();
                this.visual_controller.setLevelText(this.cur_level_index + 1);
                this.baby_x = this.cur_level.doll_start_x;
                this.baby_y = this.cur_level.doll_start_y;
                this.default_grid = this.cur_level.default_grid;
                this.grid_n = this.cur_level.grid_n;
    
                resolve(); // Resolve the Promise when done
            } catch (error) {
                reject(error); // Reject the Promise if there are any errors
            }
        });
    }

    nextLevel(){
        if (this.cur_level_index < this.levels.length - 1){
            this.cur_level_index += 1;
            this.cur_level = this.levels[this.cur_level_index];
            this.reset();
            this.visual_controller.account_controller.setCurrentLevel(this.cur_level_index + 1);
            this.visual_controller.setLevelText(this.cur_level_index + 1);
        }
    }

    previousLevel(){
        if (this.cur_level_index > 0){
            this.cur_level_index -= 1;
            this.cur_level = this.levels[this.cur_level_index];
            this.reset();
            this.visual_controller.account_controller.setCurrentLevel(this.cur_level_index + 1);
            this.visual_controller.setLevelText(this.cur_level_index + 1);
        }
    }

    reset(){
        this.baby_x = this.cur_level.doll_start_x;
        this.baby_y = this.cur_level.doll_start_y;
        this.default_grid = this.cur_level.default_grid;
        this.grid_n = this.cur_level.grid_n;

        this.changeColumns();

        this.active_grid = this.default_grid.map(tile => new VirtualTile(tile.index, tile.tile_type.name));
        this.setGridContainer(this.default_grid);
        this.drawBaby();
    }

    // sets the gridContainer element based on either default or active grid
    setGridContainer(base_grid) {
        this.grid_container.empty();
        for (var cell of base_grid) {
            this.grid_container.append(cell.element);
        }
    }

    // replace the tile at index index with a tile type name
    replaceTile(index, name){
        // replace it logically
        let new_tile = new VirtualTile(index, name);
        this.active_grid.splice(index, 1, new_tile);

        // swap the tile out visually
        const cur_elem = this.grid_container.children().eq(index);
        cur_elem.replaceWith(new_tile.element);
    }

    // this shakes the image of the baby to indicate something went wrong
    shakeBaby() {
        var $img = $('#grid_house');
        var degrees = [10, -10, 10, -10, 5, -5, 0]; // Degrees for rotation
        var duration = 50; // Duration for each rotation
    
        function rotate(index) {
            if (index >= degrees.length) return; // End the recursion
    
            $img.css({
                'transition': 'transform ' + duration + 'ms',
                'transform': 'rotate(' + degrees[index] + 'deg)'
            });
    
            setTimeout(function() {
                rotate(index + 1);
            }, duration);
        }
    
        rotate(0);
    }

    createConfetti() {
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff']; // Multiple colors
    
        for (let i = 0; i < 500; i++) { // Create 100 pieces of confetti
            const confetti = $('<div class="confetti"></div>');
            const delay = Math.random() * 2; // Random delay, up to 2 seconds
    
            $(confetti).css({
                'left': Math.random() * $(window).width() + 'px', // Random horizontal start
                'background-color': colors[Math.floor(Math.random() * colors.length)], // Random color
                'animation-duration': (Math.random() * 5 + 0.5) + 's', // Random animation duration
                'animation-delay': delay + 's', // Random delay
                'opacity': 0 // Initially hidden
            });
    
            // Set opacity to 1 after the delay
            setTimeout(() => {
                $(confetti).css('opacity', 1);
            }, delay * 1000); // Convert delay to milliseconds
    
            // Listen for the end of the animation and then remove the confetti
            $(confetti).on('animationend', function() {
                $(this).remove();
            });
    
            $('body').append(confetti);
        }
    }

    endOfLevel(){
        let _this = this;
        this.createConfetti();
        this.visual_controller.logic_controller.stopExecution("complete_level");
        setTimeout(function(){
            _this.nextLevel();
        }, 5000);
    }

    // check what is at the position of where the baby is going
    // returns true if it is somewhere the baby can go
    // false otherwise
    checkBabyPosition(x, y){
        let tile = this.default_grid[x + y * this.grid_n].tile_type.name;
        if (tile == 'pink'){
            return false;
        } else if (tile == 'start_doll'){ // CHANGE FOR END OF LEVEL TILE
            this.endOfLevel();
            return true;
        } 
        return true;
    }

    // moves the baby, changes the tiles
    moveBaby(dir){
        let old_index = this.baby_x + this.baby_y * this.grid_n;
        if (dir == "left"){
            if (this.baby_x > 0 && this.checkBabyPosition(this.baby_x - 1, this.baby_y)){
                this.baby_x -= 1;
            } else{
                this.shakeBaby();
                return false;
            }
        } else if (dir == "right"){
            if (this.baby_x < this.grid_n - 1 && this.checkBabyPosition(this.baby_x + 1, this.baby_y)){
                this.baby_x += 1;
            } else{
                this.shakeBaby();
                return false;
            }
        } else if (dir == "down"){
            if (this.baby_y < this.grid_n - 1 && this.checkBabyPosition(this.baby_x, this.baby_y + 1)){
                this.baby_y += 1;
            } else{
                this.shakeBaby();
                return false;
            }
        } else if (dir == "up"){
            if (this.baby_y > 0 && this.checkBabyPosition(this.baby_x, this.baby_y - 1)){
                this.baby_y -= 1;
            } else{
                this.shakeBaby();
                return false;
            }
        }
        this.replaceTile(old_index, this.default_grid[old_index].tile_type.name);
        this.drawBaby();
        return true; // all went well
    }

    drawBaby(){
        let cur_index = this.baby_x + this.baby_y * this.grid_n;
        this.replaceTile(cur_index, 'the_doll');
    }
}