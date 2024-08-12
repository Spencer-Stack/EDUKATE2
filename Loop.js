class Loop {
    constructor() {
        this.block_set = new BlockSet();
        this.loop_count = null;
        this.executing = true;
    }

    execute(controllers, callback) {
        let loopIndex = 0;

        const executeLoop = () => {
            if (loopIndex < this.loop_count && this.executing) {
                this.block_set.execute(controllers, () => {
                    loopIndex++;
                    executeLoop(); // Start the next loop iteration
                });
            } else if (this.executing){
                callback();
            }
        };

        executeLoop(); // Start the first loop iteration
    }

    stopExecution() {
        this.executing = false;
        this.block_set.stopExecution();
    }

    addBlock(block) {
        this.block_set.addBlock(block);
    }

    setEnd(end) {
        this.block_set.setEnd(end);
    }

    setStart(start) {
        this.block_set.setStart(start);
    }

    setLoopCount(count){
        this.loop_count = count;
    }
}