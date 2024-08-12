class Chunk {
    constructor(){
        this.blocks = [];
        this.head = null;
        this.tail = null;
    }

    setBlocks(blocks){
        this.blocks = blocks;
        this.head = this.blocks[0];
        this.tail = this.blocks[this.blocks.length - 1];
    }

    setLastMoved(){
        for (var block of this.blocks){
            block.setLastMoved(true);
        }
    }

    headId(){
        return this.head.id;
    }

    tailId(){
        return this.tail.id;
    }

    moveUp(gap){
        for (var block of this.blocks){
            block.updatePosition(block.x, block.y - gap)
        }
    }

    placeBlocks(start_x, y, gap, shift=0){
        let index = 0;
        while (index < this.blocks.length){
            let x = start_x + ((index + shift) * gap);
            this.blocks[index].updatePosition(x, y);
            index += 1;
        }
    }

    deleteBlocks(vs){
        for (var block of this.blocks){
            block.element.remove();
            delete vs.snapped_connections[block.id];
            delete vs.blocks[block.id];
        }
    }

    inChunk(id){
        for (var block of this.blocks){
            if (block.id === id){
                return true;
            }
        }
        return false;
    }

    move(gap) {
        let start_x = this.head.x;
        let y = this.head.y;
        let index = 0;
        while (index < this.blocks.length){
            let x = start_x + (index * gap);
            this.blocks[index].updatePosition(x, y);
            index += 1;
        }
    }

    setCurrentlyDragging(dragging){
        let _this = this;
        if (dragging){
            for (var block of this.blocks){
                block.setCurrentlyDragging(dragging);
            }
            this.setCanTransition(!dragging);
        } else{
            // if its being turned off, give it a small delay
            setTimeout(function(){
                for (var block of _this.blocks){
                    block.setCurrentlyDragging(dragging);
                }
                _this.setCanTransition(!dragging);
            }, 250);
        }
    }

    setCanTransition(transition){
        for (var block of this.blocks){
            block.setCanTransition(transition);
        }
    }
}