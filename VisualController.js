class VisualController {
    constructor() {
        this.virtual_controller = new VirtualController(this);
        this.logic_controller = null; // gets set by creation of logic controller
        this.account_controller = null;
        this.workspace = $('#workspace'); // Select the workspace using jQuery
        this.block_id = 0;
        this.blocks = {};
        this.dragging_block = null; // Initialize dragging_block to null
        this.dragging_block_offset = { x: 0, y: 0 }; // Initialize the offset
        this.chunk = null;

        this.block_hor_offset = -3;

        // WorkSpace offset vertical
        this.wsov = this.workspace.offset().top;
        this.wsoh = this.workspace.offset().left;

        // Initialize event handlers
        this.initializeDragAndDrop();
        this.initializeTabSelection();
        this.initializeActionButtons();
        this.initialiseMenu();
        this.initialiseLoopSliders();
        this.initialiseLevelSelect();
        this.initialiseOptionsModal();

        this.block_size = 100; // Size of the blocks
        this.snap_threshold = 1.5;
        this.top_threshold = this.block_size / 1.5;
        this.overlap_threshold = 0.7;

        // Keep track of what is snapped where so double snapping doesnt work
        // Each block that is created has an id: (left:, right:)
        this.snapped_connections = {};

        // text
        this.text_positions = [[30, 220, true], [30, 100, true], [30, 70, true], 
                            [50, 100, false], [50, 100, false], [50, 100, false], 
                            [50, 100, false], [30, 600, true], [50, 300, false], 
                            [50, 500, false]];

        this.texts = [];
        this.text_index = 0;
        this.load_text_file();

        // selectors
        this.hor_sel = $('#horizontal_selector');
        this.ver_sel = $('#vertical_selector');
        this.sel_target = null;
        let _this = this;
        // setTimeout(function(){
        //     _this.introSequence();
        // }, 50);

        this.intro_sequence_index = 0;
        this.continueSequence = false;

        // for loop sliders
        this.loop_arrow_off = 10;

        // for invisible block
        this.invisible_width = this.workspace.width();
    }

    // called upon load of page to update all the saved settings
    setOptions(){
        let data = this.account_controller.loadAccountData();
        this.setExecutionSpeed(data.execution_speed);
    }

    setExecutionSpeed(speed){
        LogicBlock.execute_time = speed;
        $(':root').css('--play_speed', speed + "ms");
        this.account_controller.setExecutionSpeed(speed);
        $('#execution-speed-value').text(speed);
    }

    initialiseOptionsModal(){
        let _this = this;
        $('#execution-speed').on('input change', function() {
            _this.setExecutionSpeed($(this).val());
        });
    }

    initialiseLevelSelect() {
        let _this = this;
        $(document).on('click', '.left-arrow', function(){
            _this.virtual_controller.previousLevel();
        });
        $(document).on('click', '.right-arrow', function(){
            _this.virtual_controller.nextLevel();
        });
    }

    initialiseLoopSliders() {
        let _this = this;
        var isMouseDown = false;
        var arrow = null;
    
        // Assuming 'document' is the parent element that exists when initialiseLoopSliders is called
        $(document).on('mousedown', '.slider', function(event) {
            event.stopPropagation();
            // Set the flag and find the arrow
            isMouseDown = true;
            arrow = $(this).find('.loop_arrow');
    
            // Move the arrow to the nearest notch
            moveArrowToNearestNotch(event.pageX, $(this));
        });
    
        $(document).on('mousemove', '.slider', function(event) {
            // Check if the mouse is down and moving
            if (isMouseDown && arrow) {
                // Move the arrow to the nearest notch
                moveArrowToNearestNotch(event.pageX, $(this));
            }
        });
    
        $(document).on('mouseup', '.slider', function() {
            // Reset the flag when mouse is released
            isMouseDown = false;
            arrow = null;
        });
    
        $(document).on('mouseleave', '.slider', function() {
            // Reset the flag when mouse leaves the slider area
            isMouseDown = false;
            arrow = null;
        });
    
        function moveArrowToNearestNotch(pageX, slider) {
            // Find the closest notch
            var closest = null;
            var closestDist = Infinity;
            slider.find('.notch').each(function() {
                var notchLeft = $(this).position().left;
                var dist = Math.abs(pageX - slider.offset().left - notchLeft);
                if (dist < closestDist) {
                    closest = $(this);
                    closestDist = dist;
                }
            });
    
            // Set the arrow's position to the closest notch
            if (closest) {
                var newArrowPosition = closest.position().left - _this.loop_arrow_off;
                arrow.css('left', newArrowPosition + 'px');
            }
        }
    }    

    initialiseMenu(){
        let _this = this;
        const menu = $('#menu-ctn');                   
        const bars = $('.menu-bars');                   
        const content = $('#menu-cnt');
        
        let firstClick = true;                       
        let menuClosed = true;
        
        let handleMenu = event => {
            if(!firstClick) {
                bars.toggleClass('crossed hamburger');
            } else {
                bars.addClass('crossed');
                firstClick = false;
            }
            
            menuClosed = !menuClosed;
            content.toggleClass('menu-visible');
            event.stopPropagation();
            if (content.hasClass('menu-visible')){
                $("#overlay").fadeIn(300);
            } else{
                $("#overlay").fadeOut(300);
            }
        };

        menu.on('click', event => {
            handleMenu(event);
        });
        
        $('body').not('#menu-cnt, #menu-ctn').on('click', event => {
            if(!menuClosed && !$('body').hasClass('modal-open')) {
                handleMenu(event);
            }
        });
        
        $('#menu-cnt, #menu-ctn').on('click', event => event.stopPropagation());

        $('#options_button').on('click', function(e){
            e.preventDefault(); // stops link doing anything
            _this.handleOptions();
        })
    }

    handleOptions(){
        $('#settingsModal').modal('show');
        let data = this.account_controller.loadAccountData();
        $('#execution-speed').val(data.execution_speed);
    }

    // whenever a block is dropped, change the invisible element width to be an extra 50px on the right of that block
    resizeWorkspace(){
        let spacing = 200; // 50 px extra
        let max_width = this.invisible_width;
        for (var key of Object.keys(this.blocks)){
            let block = this.blocks[key];
            let x = block.x + this.block_size + spacing;
            if (x > max_width){
                max_width = x;
            }
        }
        this.invisible_width = max_width;
        $('#fake_invisible').css({'width': max_width + "px"});
    }

    setLevelText(level){
        $('#level_text').text("Level " + level);
    }

    async load_text_file() {
        try {
            const response = await fetch('introduction_text.txt');
            const data = await response.text();
            const lines = data.split('\n');

            let text = "";

            for (const line of lines) {
                if (line == ""){
                    this.texts.push(text);
                    text = '';
                } else{
                    text += line;
                }
            }
            if (text){
                this.texts.push(text);
            }
        } catch (error) {
            console.error('Error reading the file:', error);
        }
    }

    runEvent() {
        if (this.intro_sequence_index < this.intro_events.length) {
            this.intro_events[this.intro_sequence_index]();
            this.intro_sequence_index += 1;
        }
    }

    introSequence(){
        let _this = this;
        this.intro_events = [
            function() { _this.moveSelTarget('block-display'); },
            function() { _this.moveSelTarget('tab-selection'); },
            function() { _this.moveSelTarget('workspace'); },
            function() { _this.moveSelTarget('run'); },
            function() { _this.moveSelTarget('stop'); },
            function() { _this.moveSelTarget('save'); },
            function() { _this.moveSelTarget('load'); },
            function() { _this.moveSelTarget('console'); },
            function() { _this.moveSelTarget('virtual_toggle'); },
            function() { _this.moveSelTarget('grid_house'); },
            function() { _this.moveSelTarget(null); },
        ];

        this.runEvent();
        this.checkForNextEvent();
    }

    checkForNextEvent() {
        let _this = this;
        if (this.intro_sequence_index < this.intro_events.length) {
            $(document).on("click keydown", function(e) {
                if (e.type === "click" || (e.type === "keydown" && e.key === "Escape")) {
                    $('.tile_img').css({'z-index': 0});
                    $("#" + _this.sel_target).css({'z-index': 0});
                    if (e.key === "Escape") {
                        // Break out of the entire sequence
                        this.continueSequence = false;
                        _this.moveSelTarget(null);
                        $(document).off("click keydown");
                        this.intro_sequence_index = 0;
                    } else {
                        // Run next event
                        _this.runEvent();
                    }
                }
            });
        }
    }

    displayText(target){
        if (this.text_index < this.texts.length && target != null){
            let text = this.texts[this.text_index];
            let pos = this.text_positions[this.text_index];
            this.showTextBubble(pos[0], pos[1], pos[2], text);
            this.text_index += 1;
        } else{
            this.continueSequence = false;
            this.intro_sequence_index = 0;
            this.hideTextBubble();
        }
    }

    // creates a Block based on an element
    createBlock(blockType, blockTab, x, y){
        // Create a new block using the data
        blockType = new BlockType(blockType); // name of the blocktype
        const newBlock = new Block(this.block_id, blockType, blockTab, this);

        let u_x = x - this.dragging_block_offset.x - this.wsoh + this.workspace.scrollLeft();
        let u_y = y - this.dragging_block_offset.y - this.wsov;

        newBlock.updatePosition(u_x, u_y);

        this.blocks[this.block_id] = newBlock;

        // Add this block to list of snapped blocks
        this.snapped_connections[this.block_id] = {"left": null, "right": null};
        
        this.workspace.append(newBlock.element);

        this.block_id += 1;

        return newBlock;
    }

    reset(blocks, snaps){
        this.workspace.children().not('#fake_invisible').remove();
        this.block_id = Object.keys(blocks).length;
        this.blocks = blocks;
        this.dragging_block = null; // Initialize dragging_block to null
        this.dragging_block_offset = { x: 0, y: 0 }; // Initialize the offset
        this.chunk = null;
        this.snapped_connections = snaps;

        for (var key of Object.keys(this.blocks)){
            let block = this.blocks[key];
            block.updatePosition(block.x, block.y); // move back by offset
            this.workspace.append(block.element);
        }

        this.resizeWorkspace();
    }

    // Initialize drag and drop behavior
    initializeDragAndDrop() {
        let _this = this;

        // Handle the drop event on the document that isnt the workspace
        $('#work_area').on('mouseup', (event) => {
            event.preventDefault();
            if (this.dragging_block) {
                const dropTarget = $(event.target);
                // Check if the drop occurred outside the workspace
                if (!dropTarget.is(this.workspace)) {
                    // Delete the dragging_block if dropped outside the workspace
                    this.deleteChunk();
                    this.dragging_block = null;
                    this.dragging_block_offset = { x: 0, y: 0 };
                    this.resizeWorkspace();
                }
            }
        });

        // Handle the drop event
        this.workspace.on('mouseup', (event) => {
            event.preventDefault();

            if (this.dragging_block) {
                // Calculate the drop position based on the offset
                let dropX = event.pageX - this.dragging_block_offset.x;
                let dropY = event.pageY - this.dragging_block_offset.y;

                if (this.dragging_block.new){
                    // if its new, subtract the offset
                    dropX = dropX - this.wsoh + this.workspace.scrollLeft();
                    dropY -= this.wsov;
                }

                //check need new in dragging block

                this.checkChunkDrop(dropX, dropY);

                // Reset dragging_block to null and offset to zero
                this.dragging_block = null;
                this.dragging_block_offset = { x: 0, y: 0 };

                this.chunk.setCurrentlyDragging(false);
            }
        });

        // Handle dragstart event listeners on blocks
        $('.block').on('mousedown', (event) => {
            if (_this.continueSequence){
                return;
            }
            let target = $(event.target);
            if (!target.hasClass('block')){
                target = target.parent();
            }

            const offset = $(target).offset();
            _this.dragging_block_offset.x = event.pageX - offset.left;
            _this.dragging_block_offset.y = event.pageY - offset.top;

            const blockTab = $(target).data('tab');
            const blockType = $(target).data('block_type');

            let block = this.createBlock(blockType, blockTab, event.pageX, event.pageY);

            // Set the dragging_block to the current block
            this.dragging_block = { id: block.id, new: true };
        
            this.populateChunk(block);
            this.chunk.setCurrentlyDragging(true);
            this.setLastMoved();
        });

        $(document).on('mousemove', function(e) {
            if (_this.continueSequence){
                return;
            }
            if (_this.dragging_block){
                let x = e.pageX - _this.dragging_block_offset.x;
                let y = e.pageY - _this.dragging_block_offset.y;

                if (_this.dragging_block.new){
                    // if its new, subtract the offset
                    x = x - _this.wsoh + _this.workspace.scrollLeft();
                    y -= _this.wsov;
                }

                _this.chunk.head.updatePosition(x, y);
                _this.chunk.move(_this.block_size + _this.block_hor_offset);
            }
        });
    }

    // remove chunk from the dom
    deleteChunk(){
        this.chunk.deleteBlocks(this);
    }

    // this is triggered whenever a block from inside gets picked up
    handleInsideBlockMove(block) {
        this.populateChunk(block); // set the chunk
        this.chunk.setCurrentlyDragging(true);
        this.setLastMoved();
        // now, remove the chunk from the snaps
        this.removeAndStitch();
    }

    // removes the current chunk from the snaps and then stitches snaps back together
    removeAndStitch(){
        let left = this.snapped_connections[this.chunk.headId()]['left'];
        let right = this.snapped_connections[this.chunk.tailId()]['right'];
        this.removeSnaps();
        this.stitchSnaps(left, right);
    }

    // removes the current chunk from the snaps
    removeSnaps(chunk=null){
        let c = null; // c is the chunk to do the removing of
        if (chunk == null){
            c = this.chunk;
        } else{
            c = chunk;
        }
        let left = this.snapped_connections[c.headId()]['left'];
        let right = this.snapped_connections[c.tailId()]['right'];
        if (left != null){
            this.snapped_connections[left]['right'] = null;
            this.snapped_connections[c.headId()]['left'] = null;
        }
        if (right != null){
            this.snapped_connections[right]['left'] = null;
            this.snapped_connections[c.tailId()]['right'] = null;
        }
    }

    // stitches two blocks together
    stitchSnaps(left, right) {
        if (left == null || right == null){
            return;
        }
        this.snapped_connections[left]['right'] = right;
        this.snapped_connections[right]['left'] = left;
    }

    // sets te chunk based on a block
    populateChunk(block, chunk=null, size=null){
        let cons = this.snapped_connections[block.id];
        let chunk_blocks = [block];
        let block_id = cons["right"];
        let block_counter = 1; // limits amount of blocks in chunk (for overlap)
        while (block_id != null){
            if (size != null && block_counter == size){
                break;
            }
            let b = this.blocks[block_id];
            chunk_blocks.push(b);
            block_id = this.snapped_connections[block_id]["right"];
            block_counter += 1;
        }

        if (chunk == null){
            this.chunk = new Chunk();
            this.chunk.setBlocks(chunk_blocks);
        } else{
            chunk.setBlocks(chunk_blocks);
        }
    }

    calculateOverlap(drop, element) {        
        // Extracting left and top values from the points
        var left1 = drop[0], top1 = drop[1];
        var left2 = element[0], top2 = element[1];
    
        // Calculate the right and bottom edges of the first square
        var right1 = left1 + this.block_size;
        var bottom1 = top1 + this.block_size;
    
        // Calculate the right and bottom edges of the second square
        var right2 = left2 + this.block_size;
        var bottom2 = top2 + this.block_size;
    
        // Check if the squares are not overlapping
        if (right1 <= left2 || left1 >= right2 || bottom1 <= top2 || top1 >= bottom2) {
            return 0; // The squares are not overlapping
        }

        let width = Math.abs(left1 - left2);
        let height = Math.abs(top1 - top2);

        let dx = this.block_size - width;
        let dy = this.block_size - height;

        return (dx * dy) / (this.block_size * this.block_size);
    }

    // this is triggered when the head overlaps enough with 'block' to perform a swap
    swapFromOverlap(block){
        let cur_chunk_len = this.chunk.blocks.length;
        // the current chunk is the one being moved
        // create a new chunk to keep track of what needs to be moved up
        let overlap_chunk = new Chunk();
        this.populateChunk(block, overlap_chunk, cur_chunk_len);

        // now have to move the snaps from overlap_chunk to this.chunk
        // left and right are what were there
        let left = this.snapped_connections[overlap_chunk.headId()]['left'];
        let right = this.snapped_connections[overlap_chunk.tailId()]['right'];
        this.removeSnaps(overlap_chunk); // sever snaps of overlap_chunk

        // and now stitch the snaps to the new block
        this.stitchSnaps(left, this.chunk.headId());
        this.stitchSnaps(this.chunk.tailId(), right);    

        // and center the now normal chunk
        let start_x = block.x;
        this.chunk.placeBlocks(start_x, block.y, this.block_size + this.block_hor_offset);

        // now move the old chunk upwards
        overlap_chunk.moveUp(this.block_size + 10);
    }

    // this is triggered when the head is dropped somewhere that doesnt result in a snap
    handleNoSnap(dropX, dropY){
        this.chunk.placeBlocks(dropX, dropY, this.block_size + this.block_hor_offset);
    }

    handleSnap(left_overlap, right_overlap) {
        this.handleInsertSnaps(left_overlap, right_overlap);
        this.handleInsertPosition(left_overlap, right_overlap);
    }

    handleInsertPosition(left_overlap, right_overlap){
        if (left_overlap != null && right_overlap != null){
            // this means its an insert in between two existing blocks
            let start_x = left_overlap.x + this.block_size + this.block_hor_offset;
            this.chunk.placeBlocks(start_x, left_overlap.y, this.block_size + this.block_hor_offset);
            let right_block_id = this.snapped_connections[this.chunk.tailId()]["right"];
            this.shiftBlocks(right_block_id, "right", this.chunk.blocks.length); // probs broken
        } else if (left_overlap == null && right_overlap != null){
            // its on the end at the left (so the start)
            let start_x = right_overlap.x - this.block_size - this.block_hor_offset;
            this.chunk.placeBlocks(start_x, right_overlap.y, this.block_size + this.block_hor_offset, 1);
            let right_block_id = this.snapped_connections[this.chunk.tailId()]["right"];
            this.shiftBlocks(right_block_id, "right", this.chunk.blocks.length); // probs broken
        } else if (left_overlap != null && right_overlap == null){
            // its on the end at the right
            let start_x = left_overlap.x + this.block_size + this.block_hor_offset;
            this.chunk.placeBlocks(start_x, left_overlap.y, this.block_size + this.block_hor_offset);
        }
    }

    // when handleSnap is triggered, it calls this to fix snaps
    handleInsertSnaps(left_overlap, right_overlap){
        if (left_overlap != null && right_overlap != null){
            this.stitchSnaps(left_overlap.id, this.chunk.headId());
            this.stitchSnaps(this.chunk.tailId(), right_overlap.id);
        } else if (left_overlap == null && right_overlap != null){
            // its on the end at the left (so the start)
            this.stitchSnaps(this.chunk.tailId(), right_overlap.id);
        } else if (left_overlap != null && right_overlap == null){
            // its on the end at the right
            this.stitchSnaps(left_overlap.id, this.chunk.headId());
        }
    }

    checkChunkDrop(dropX, dropY) {
        // this snap will do everything based on chunk
        let did_snap = false;
        let left_overlap = null;
        let right_overlap = null;

        let dropXLeft = dropX;
        let dropXRight = dropX + this.block_size;

        for (var id in this.blocks){
            let block = this.blocks[id];
            if (!this.chunk.inChunk(block.id)) {
                let leftX = block.x;
                let rightX = block.x + this.block_size;
                let height = block.y;

                let overlap = this.calculateOverlap([dropX, dropY], [block.x, block.y]);
                if (overlap > this.overlap_threshold){
                    // indicates a block should be swapped
                    this.swapFromOverlap(block);
                    return;
                }

                let dxVert = height - dropY;
                if (Math.abs(dxVert) > this.top_threshold){
                    // too far up or down
                    continue;
                }

                if (leftX < dropXLeft && dropXLeft < rightX){
                    // left overlap
                    left_overlap = block;
                    did_snap = true;
                }

                if (leftX < dropXRight && dropXRight < rightX){
                    // left overlap
                    right_overlap = block;
                    did_snap = true;
                }
            }
        }

        let threshold = this.snap_threshold * this.block_size;

        // if both are null, then go and check thresholds for distance
        if (left_overlap == null && right_overlap == null){
            let smallest_dist = threshold;
            let best_block = null;
            for (var id in this.blocks){
                let block = this.blocks[id];
                if (!this.chunk.inChunk(block.id)) {
                    let dxLeft = block.x - dropX;
                    let dxTop = block.y - dropY;
                    if (Math.abs(dxTop) < this.top_threshold){
                        // this means that its either on the left or right of a set of blocks
                        let dist = Math.sqrt(dxLeft * dxLeft + dxTop * dxTop);
                        if (dist < threshold && dist < smallest_dist){
                            smallest_dist = dist;
                            best_block = block;
                        }
                    }
                }
            }

            // this means it found a block that suits it, so figure out its side
            // and set it
            if (best_block != null){
                if (best_block.x > dropX){
                    // the block is on the right, pretend its got a right overlap
                    right_overlap = best_block;
                } else{
                    left_overlap = best_block;
                }
                did_snap = true;
            }
        }

        // If not snapped to either side, update the position to the drop location
        if (!did_snap) {
            this.handleNoSnap(dropX, dropY);
        } else{
            this.handleSnap(left_overlap, right_overlap);
        }

        this.resizeWorkspace();
    }

    // shift blocks across whenever one is inserted between two blocks
    // block is is the id to start the shifting from
    shiftBlocks(block_id, dir, amount){
        while (block_id != null){
            let block = this.blocks[block_id];
            block.shiftBlock(amount * (this.block_size + this.block_hor_offset), dir);
            // then find the next block to shift over
            block_id = this.snapped_connections[block_id]["right"];
        }
    }

    // Initialize tab selection
    initializeTabSelection() {
        // Initial tab selection
        this.showBlocks('Initialise');
        let _this = this;

        // Handle tab button click using event delegation
        $('.header').on('click', '.tab-button', (event) => {
            if (_this.continueSequence){
                return;
            }
            const tabText = $(event.target).text();
            this.showBlocks(tabText);
        });
    }

    // Show blocks based on the selected tab
    // TODO consider animating this swap over to make it apparent / look nice
    showBlocks(selectedTab) {
        $('.block[data-placed="false"]').hide();
        $('.block[data-tab="' + selectedTab + '"]').show();
    }

    showInfoAlert(message) {
        Swal.fire({
            title: 'Information',
            text: message,
            icon: 'info', // Use 'info' for informational messages
            showCancelButton: false, // No cancel button for info alerts
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
        });
    }

    parseCode(){
        // Call the logic controller's run or setup function
        this.logic_controller.reset();
        this.virtual_controller.reset();
        this.setConsole("");
        let parse_result = this.logic_controller.parseVisual(this.blocks, this.snapped_connections);
        return parse_result;
    }

    // Initialize action buttons
    initializeActionButtons() {
        let _this = this;
        // Set up the run, stop, save, and load action buttons
        // These buttons will be connected to the logic controller in the future

        $('.virtual_toggle').on('click', function () {
            if (_this.continueSequence){
                return;
            }
            $('#virtual').toggleClass('expanded');
            $('#arrow').toggleClass('expanded');
        });

        $('#run').on('click', function () {
            if (_this.continueSequence){
                return;
            }
            let controllers = {
                'visual_controller': this,
                'virtual_controller': this.virtual_controller,
                'logic_controller': this.logic_controller
            };
            let parse_result = _this.parseCode();
            if (parse_result["res"]){
                _this.logic_controller.execute(controllers);
            } else{
                _this.showInfoAlert(parse_result['text']);
            }
        });

        $('#stop').on('click', function () {
            if (_this.continueSequence){
                return;
            }
            // Call the logic controller's stop function
            _this.logic_controller.stopExecution("user_stop");
        });

        $('#load').on('click', function () {
            if (_this.continueSequence){
                return;
            }
            $("#overlay").fadeIn(300);
            _this.account_controller.populateLoadTable();
        });
    }

    showTextBubble(x, y, is_left, text) {
        $("#textBubble").text(text); // Set the text
    
        const positionStyle = {
            "top": y + "px",
            "display": "block" // Make it visible
        };
    
        if (is_left) {
            positionStyle.left = x + "px";
            positionStyle.right = ''; // Reset right
        } else {
            positionStyle.right = x + "px";
            positionStyle.left = ''; // Reset left
        }
    
        $("#textBubble").css(positionStyle);
    }

    hideTextBubble(){
        $("#textBubble").css({'display': 'none'});
    }

    doSelMovement(target){
        let elem = $("#"+target);
        $("#overlay").fadeIn(2000);
        elem.css({'z-index': 11});
        // set up all variables needed
        let position = elem.offset();
        let top = position.top;
        let left = position.left;
        let width = elem.outerWidth();
        let height = elem.outerHeight();
        let padding = 20;

        // show the selectors
        this.hor_sel.css({'visibility': 'visible'});
        this.ver_sel.css({'visibility': 'visible'});

        // set the selector widths and heights
        let hor_sel_height = height + padding;
        this.hor_sel.css({'height': hor_sel_height + "px"});

        let ver_sel_width = width + padding;
        this.ver_sel.css({'width': ver_sel_width + "px"});

        // set selector positions
        let hor_sel_top = top - padding / 2;
        this.hor_sel.css({'top': hor_sel_top + "px"});

        let ver_sel_left = left - padding / 2;
        this.ver_sel.css({'left': ver_sel_left + "px"});
    }

    moveSelTarget(target){
        let _this = this;
        let completedPromise = Promise.resolve();
        this.sel_target = target;

        this.displayText(target);

        if (target == null){
            this.hor_sel.css({'visibility': 'hidden'});
            this.ver_sel.css({'visibility': 'hidden'});
            $("#overlay").fadeOut(2000);
        } else{
            if (target == 'grid_house' || target == 'python_output'){
                if (!$('#virtual_toggle').hasClass('expanded')){
                    $('#virtual').toggleClass('expanded');
                    $('#arrow').toggleClass('expanded'); 
                    setTimeout(() => {
                        _this.doSelMovement(target);
                        $('.tile_img').css({'z-index': 11});
                    }, 500);               
                }
            } else{
                _this.doSelMovement(target);
            }
        }

        return completedPromise;
    }

    // good is true if the program execution wasn't an error, its false otherwise
    setConsole(text, good=true){
        let console = $('#console');
        console.text(text);
        if (!good){
            console.css({'color': '#fc4903'})
        } else{
            console.css({'color': '#07b013'})
        }
    }

    setLastMoved(){
        for (var id in this.blocks){
            let block = this.blocks[id];            
            block.setLastMoved(false);
        }
        this.chunk.setLastMoved();
    }
}