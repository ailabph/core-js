import {config} from "../ailab-core";

export class patcher{

    private static getPatchDirectory(of_core_module:boolean = false):string{
        return config.getBaseDirectory() + "/patch";
    }
}