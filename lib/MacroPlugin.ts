import {execFileSync} from "child_process";
import {File} from "fuse-box/core/File";
import {Plugin} from "fuse-box/core/WorkflowContext";

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function rm(path: string){
  return execFileSync("/bin/rm", [path]);
}

abstract class MacroProcessor{
  protected readonly binPath: string;

  protected exec(...args: string[]): string{
    return execFileSync(this.binPath, args).toString();
  }

  protected execWrite(input: string, ...args: string[]): string{
    return execFileSync(this.binPath, args, {input}).toString();
  }

  public abstract freeze(input: string): string;
  public abstract process(freezePath: string, input: string): string;
}

class M4 extends MacroProcessor{
  protected readonly binPath = "/usr/bin/m4";

  constructor(){
    super();
  }

  public freeze(inputPath: string): string{
    const freezePath = `${inputPath}f`;
    this.exec("-P", "-F", freezePath, inputPath);
    return freezePath;
  }

  public process(freezePath: string, inputpath: string): string{
    return this.exec("-P", "-R", freezePath, inputpath);
  }
}

export interface MacroPluginOptions{
  defineFilePath: string;
  ignoreFiles?: string[];
}

export class MacroPluginClass implements Plugin{
  private freezeFilePath: string;
  public test: RegExp;

  constructor(
    public options: MacroPluginOptions,
    private processor: MacroProcessor
  ){
    if(options.ignoreFiles){
      this.test = new RegExp(`^(?!.*(?:${options.ignoreFiles.map(f => escapeRegExp(f)).join("|")})$).*`);
    }else{
      this.test = /.*/;
    }
  }

  public init(){
    this.freezeFilePath = this.processor.freeze(this.options.defineFilePath);
  }

  public bundleEnd(){
    rm(this.freezeFilePath);
  }

  public onTypescriptTransform(file: File){
    if(!this.test.test(file.relativePath)) return;
    
    file.contents = this.processor.process(this.freezeFilePath, file.absPath);
  }
}

export const MacroPlugin = (options?: MacroPluginOptions) => {
  return new MacroPluginClass(options, new M4());
}
