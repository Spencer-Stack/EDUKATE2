// logic blocks are created when the visual blocks are parsed by the visual controller
class LogicBlock {
    static execute_time = 1000;
    // basically double linked list for blocks
    constructor(id, visualBlock, next, prev, type) {
        this.id = id;
        this.visualBlock = visualBlock;
        this.next = next; // either a logic block or a block_set_host
        this.prev = prev; // either a logic block or a block_set_host
        this.block_type = type;
        this.executing = true;
    }

    stopExecution() {
        this.executing = false;
    }

    static constructFromVisual(visual_block, snap){
        let prev = snap['left'];
        let next = snap['right'];
        let logic_block = new LogicBlock(visual_block.id, visual_block, next, prev, visual_block.block_type);
        return logic_block;
    }

    execute(controllers, callback){
        if (!this.executing){
            return;
        }
        let result = true;
        if (this.block_type.name == "move_right"){
            result = controllers.virtual_controller.moveBaby("right");
        } else if (this.block_type.name == "move_up"){
            result = controllers.virtual_controller.moveBaby('up');
        } else if (this.block_type.name == "move_down"){
            result = controllers.virtual_controller.moveBaby('down');
        } else if (this.block_type.name == "move_left"){
            result = controllers.virtual_controller.moveBaby('left');
        } else if (this.block_type.name == "stop"){
            controllers.logic_controller.stopExecution("stop_block");
        }

        this.visualBlock.flash();
        
        // the result was bad (in this case, for the baby hitting a wall, but should be much more)
        if (!result){
            controllers.logic_controller.stopExecution("hit_something");
        }

        // Call the callback after a one-second delay
        setTimeout(() => {
            callback();
        }, LogicBlock.execute_time);
    }
}