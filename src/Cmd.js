const child_process=require("child_process");

class Cmd {
	constructor(cmd) {
		this.cmd=cmd;
		this.args=[];
		this.expectedReturnCode=0;
		this.output="";
	}

	arg(...args) {
		this.args=[...this.args,...args];

		return this;
	}

	onOutput(out) {
		this.output+=out.toString();
	}

	run() {
		return new Promise((resolve, reject)=>{
			let proc=child_process.spawn(this.cmd,this.args);

			proc.stdout.on("data", this.onOutput.bind(this));
			proc.stderr.on("data", this.onOutput.bind(this));

			proc.on("error",(res)=>{
				reject("Proc error: "+res);
			});

			proc.on("close",(res)=>{
				if (res!=this.expectedReturnCode)
					reject("Proc error: "+res);

				else
					resolve(this.output);
			});
		});
	}
}

module.exports=Cmd;
