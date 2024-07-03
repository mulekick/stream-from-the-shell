/* eslint-disable no-use-before-define, accessor-pairs, lines-between-class-members */

import {StreamingSlot, StateSignature} from "../../interfaces.ts";


class ProgramState {
    // private static singleton instance placeholder
    private static singleton:ProgramState;

    // private property for actual object storage
    private state:StateSignature;

    // singleton constructor is only accessible from inside the class
    private constructor(ps:StateSignature) {
        this.state = ps;
    }

    // public accessor to the singleton instance
    public static get instance():ProgramState {
        if (typeof ProgramState.singleton === `undefined`)
            ProgramState.singleton = new ProgramState({} as StateSignature);
        return ProgramState.singleton;
    }

    // public getters and setters for internal properties of the stored object ...
    public get currentSlot():StreamingSlot { return this.state.currentSlot; }
    public set currentSlot(v:StreamingSlot) { this.state.currentSlot = v; }

    public get totalLoopTime():number { return this.state.totalLoopTime; }
    public set totalLoopTime(v:number) { this.state.totalLoopTime = v; }

    public get transcodedTime():number { return this.state.transcodedTime; }
    public set transcodedTime(v:number) { this.state.transcodedTime = v; }

    public get elapsedTime():number { return this.state.elapsedTime; }
    public set elapsedTime(v:number) { this.state.elapsedTime = v; }

    public get processStdErrMsgs():boolean { return this.state.processStdErrMsgs; }
    public set processStdErrMsgs(v:boolean) { this.state.processStdErrMsgs = v; }
}

export default ProgramState;