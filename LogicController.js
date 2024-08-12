// logical execution will use BlockSets
// A blockset is a set of blocks that are apart of the same piece of functionality (main, func, if, loop, etc)

class LogicController {
    constructor(visual_controller) {
        this.blocks = {}; // logic blocks, indexed by id (unordered, as opposed to the blockSet)
        this.visual_controller = visual_controller;
        // main block set is the block set that contains all blocks in the program
        this.block_sets = this.freshBlockSets(true);
        this.simplistic_block_sets = this.freshBlockSets(false); // for exporting as strings

        this.all_block_set_hosts = [];
        this.run_main_code_name = 'start_virtual';
        this.cur_start_name = null; // somewhat of a throwaway variable
    }

    addBlock(block){
        this.block_sets[this.cur_start_name].addBlock(block);
    }

    execute(controllers){
        $('#run').prop('disabled', true);
        $('#stop').prop('disabled', false);
        this.block_sets[this.run_main_code_name].execute(controllers, () => {
            if (this.block_sets[this.run_main_code_name].executing){
                this.stopExecution("run_success");
            }
        });
    }

    stopExecution(reason){
        this.block_sets[this.run_main_code_name].stopExecution();
        if (reason == "hit_something"){
            this.visual_controller.setConsole("The baby bumped into a wall!", false);
        } else if (reason == "stop_block"){
            this.visual_controller.setConsole("The program was stopped by a stop block");
        } else if (reason == "complete_level"){
            this.visual_controller.setConsole("The baby completed the level!");
        } else if (reason == "user_stop"){
            this.visual_controller.setConsole("You have stopped the program");
        } else if (reason == "run_success"){
            this.visual_controller.setConsole("The program ran successfully");
        }
        $('#stop').prop('disabled', true);
        $('#run').prop('disabled', false);
    }

    // checks to see if a block needs to pop or push new blocksets
    getCurrentBlockSet(block_sets, block){
        if (block.block_type.name == "start_loop"){
            // this means we need to create a new loop object
            let loop = new Loop();
            loop.setStart(block.id);
            block_sets.push(loop);
            this.all_block_set_hosts.push(loop);
        } else if (block.block_type.name == "end_loop"){
            // when this pops, it needs to add it back to the next highest level as a 'block'
            let filled = block_sets.pop();
            filled.setEnd(block.id);
        }
        return block_sets[block_sets.length - 1];
    }

    // only both with the starts and ends of block sets?
    blockSetHostIn(id){
        let _this = this;
        for (var block_set_host of this.all_block_set_hosts){
            if (block_set_host === _this){
                if (_this.block_sets[_this.cur_start_name].start == id){
                    return [true, _this];
                } 
                else if (_this.block_sets[_this.cur_start_name].end == id){
                    return [false, _this];
                }
            } else{
                if (block_set_host.block_set.start == id){
                    return [true, block_set_host];
                } 
                else if (block_set_host.block_set.end == id){
                    return [false, block_set_host];
                }
            }
        }
        return [null, null];
    }

    freshBlockSets(block_set){
        if (block_set){
            return {
                'start_virtual': new BlockSet(),
                'back_button': new BlockSet()
            };
        } else{
            return {
                'start_virtual': {'blocks': [], 'loop_counts': []},
                'back_button': {'blocks': [], 'loop_counts': []},
            };
        }
    }

    reset(){
        this.blocks = {};
        this.block_sets = this.freshBlockSets(true);
        this.simplistic_block_sets = this.freshBlockSets(false); // for exporting as strings
        this.all_block_set_hosts = [];
    }

    // this checks to make sure the syntax of the loops is correct
    loopCheck(start_block_id, blocks, snaps){
        let next = start_block_id;
        let block = null;

        // cant dip below 0, can't end on anything but 0
        let running_loop_count = 0;

        while (next != null){
            block = blocks[next];
            let block_snap = snaps[block.id];
            next = block_snap['right'];

            if (block.block_type.name == "start_loop"){
                running_loop_count += 1;
            } else if (block.block_type.name == "end_loop"){
                running_loop_count -= 1;
            }

            if (running_loop_count < 0){
                return {'res': false, 'text': "There is a loop finish block incorrectly before a loop start block"};
            }
        }

        if (running_loop_count > 0){
            return {'res': false, 'text': "There are more loop start blocks that loop finish blocks"};
        }

        return {"res": true};
    }

    // helper function of parseVisual, returns the main big blockset
    buildBlockSets(blocks, snaps){
        // this is a list of blocksets, they act as scopes for blocks
        // when a start loop or if statement is reached, we go into another blockset
        // when it ends, the block set is popped back out of
        let _this = this;
        let block_sets = [this];
        let cur_block_set_host = this;
        this.all_block_set_hosts.push(this);

        let start_block = null;
        Object.keys(blocks).forEach(function(key) {
            let b = blocks[key];
            if (b.block_type.name == _this.cur_start_name){
                start_block = b;
            }
        });

        if (start_block == null && _this.cur_start_name == _this.run_main_code_name){
            return {'res': false, 'text': "No start block found"};
        }

        // so if its one of the events, just don't do anything
        if (start_block == null){
            return {'res': true};
        }

        let loops_fine = this.loopCheck(start_block.id, blocks, snaps);
        if (!loops_fine['res']){
            return loops_fine;
        }

        let dont_add = ["start_loop", "end_loop"];

        let next = start_block.id;
        let block = null;

        while (next != null){
            block = blocks[next];
            this.simplistic_block_sets[this.cur_start_name]['blocks'].push(block);
            let block_snap = snaps[block.id];
            // first check to see if the block set needs to change
            cur_block_set_host = this.getCurrentBlockSet(block_sets, block);

            let logic_block = LogicBlock.constructFromVisual(block, block_snap);
            // add new logic block to list of all blocks
            this.blocks[block.id] = logic_block;

            // then add it to the specific block set if its an actual block
            if (!dont_add.includes(logic_block.block_type.name)){
                cur_block_set_host.addBlock(logic_block);
            } else if (logic_block.block_type.name == "start_loop"){
                cur_block_set_host.setLoopCount(logic_block.visualBlock.getLoopCount());

                this.simplistic_block_sets[this.cur_start_name]['loop_counts'].push(logic_block.visualBlock.getLoopCount());

                let level_above = block_sets[block_sets.length - 2];
                level_above.addBlock(cur_block_set_host) // add the cur host
            }
            next = block_snap['right'];
        }

        Object.keys(_this.blocks).forEach(function(key) {
            let b = _this.blocks[key];
            if (b.next != null){
                // now go and set all of the next's correctly for the normal blocks and loop objects
                let [is_start, block_host] = _this.blockSetHostIn(b.next);
                if (block_host != null){
                    // this means either this block is pointing to start or end of block set host
                    if (is_start){
                        b.next = block_host;
                    } else{
                        b.next = null;
                    }
                }
            }

            if (b.prev != null){
                let [is_start, block_host] = _this.blockSetHostIn(b.prev);
                if (block_host != null){
                    if (is_start){
                        b.prev = null;
                    } else{
                        b.prev = block_host;
                        block_host.block_set.next = b.id;
                    }
                }
            }
        });

        return {"res": true};
    }

    // given a list of visual blocks and their snaps, build out all of the blocksets and logic blocks
    // builds multiple blocksets for each event trigger
    parseVisual(blocks, snaps){
        let start_names = ['start_virtual', 'back_button'];
        for (let start_name of start_names){
            this.cur_start_name = start_name;
            let res = this.buildBlockSets(blocks, snaps);
            if (!res['res']){
                return res;
            }
        }
        return {"res": true};
    }

    // this will export as a string to send to the arduino
    exportAsChars(){
        // specs:
        // - each event section is seperated by |
        // - each block has a number that represents it
        // - for a loop start block, the next number after that is its loop count, not the next block!
        
        // decompose each of the block sets into the direct blocks
        this.simplistic_block_sets

        // write here what the order being sent is in terms of events
        // - start_virtual
        // - back_button

        let send_str = "<";

        for (let key of Object.keys(this.simplistic_block_sets)){
            let blocks = this.simplistic_block_sets[key]['blocks'];
            for (let block of blocks){
                let str = this.convertBlockToIdStr(block);
                send_str += str;
                if (block.block_type.name == 'start_loop'){
                    // append both the index and then its count
                    let loop_count = this.simplistic_block_sets[key]['loop_counts'].shift();
                    send_str += "" + loop_count;
                }
            }
            send_str += '|';
        }

        return send_str + ">";
    }

    convertBlockToIdStr(block) {
        let block_names_to_id = [
            'start_virtual',
            'start_doll',
            'stop',
            'start_loop',
            'end_loop',
            'move_right',
            'move_up',
            'move_left',
            'move_down',
            'something_close_right',
            'something_close_left',
            'back_button',
            'face_touch',
        ];
    
        let type = block.block_type.name;
        let index = block_names_to_id.indexOf(type);
    
        // Convert index to letter if greater than 9
        if (index >= 10) {
            return String.fromCharCode('A'.charCodeAt(0) + (index - 10));
        }
    
        return "" + index;
    }    
}