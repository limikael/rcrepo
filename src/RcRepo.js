const fs=require("fs");
const path=require("path");
const Revision=require("./Revision");
const Remote=require("./Remote");

class RcRepo {
	constructor() {
		this.cwd=process.cwd();
		this.statusChars={
			"new": "N",
			"missing": "X",
			"modified": "M",
			"up-to-date": "-"
		}
	}

	getRemotes() {
		if (this.remotes)
			return this.remotes;

		this.remotes=[];
		let json=fs.readFileSync(this.getRepoStatusDir()+"/remote-paths.json")
		let datas=JSON.parse(json);

		for (let data of datas) {
			let remote=new Remote(data);
			this.remotes.push(remote);
		}

		return this.remotes;
	}

	info() {
		console.log("Local Path:   "+this.findRepoDir());
		console.log("Remote Paths: ");
		for (let remote of this.getRemotes())
			console.log("  "+remote.getRclonePath());
	}

	findRepoDir() {
		let p=path.resolve(this.cwd);

		while (1) {
			if (fs.existsSync(p+"/.rcrepo"))
				return p;

			if (p==path.resolve(p+"/.."))
				return null;

			p=path.resolve(p+"/..");
		}
	}

	loadLocalRevision() {
		return Revision.load(this.findRepoDir());
	}

	getRepoStatusDir() {
		return this.findRepoDir()+"/.rcrepo";
	}

	makeBase() {
		let localRevision=Revision.load(this.findRepoDir());
		localRevision.saveJson(this.getRepoStatusDir()+"/base-revision.json");
	}

	localStatus(options) {
		let localRevision=Revision.load(this.findRepoDir());
		let baseRevision=Revision.loadJson(this.getRepoStatusDir()+"/base-revision.json");
		let names=Revision.allFileNames([localRevision,baseRevision]);

		for (let name of names) {
			let status=localRevision.getStatusAgainstBase(name,baseRevision);
			if (status!="up-to-date" || options.all)
				console.log("  "+this.statusChars[status]+"  "+name);
		}
	}

	status(options) {
		let localRevision=Revision.load(this.findRepoDir());
		let baseRevision=Revision.loadJson(this.getRepoStatusDir()+"/base-revision.json");

		let remoteRevisions=[];
		for (let remote of this.getRemotes())
			remoteRevisions.push(Revision.load(remote.getRclonePath()));		

		let names=Revision.allFileNames([localRevision,baseRevision,...remoteRevisions]);

		for (let name of names) {
			let status, haveDirty=false, s="  ";

			status=localRevision.getStatusAgainstBase(name,baseRevision);
			if (status!="up-to-date")
				haveDirty=true;

			s+=this.statusChars[status];

			for (let remoteRevision of remoteRevisions) {
				status=remoteRevision.getStatusAgainstBase(name,baseRevision);
				if (status!="up-to-date")
					haveDirty=true;

				s+=this.statusChars[status];
			}

			s+="  "+name;

			if (options.all || haveDirty)
				console.log(s);
		}
	}

	init(options) {
		let localRevision=Revision.load(this.findRepoDir());
		let remoteRevisions=[];
		for (let remote of this.getRemotes())
			remoteRevisions.push(Revision.load(remote.getRclonePath()));		

		let allRevisions=[localRevision,...remoteRevisions]
		let names=Revision.allFileNames(allRevisions);

		for (let name of names) {
			let latestRevision=Revision.revisionWithLatest(allRevisions,name);

			if (!localRevision.getFileInfoByPath(name)) {
				let index=1+remoteRevisions.indexOf(latestRevision);
				console.log("  <- "+index+"  "+name);

				if (!options["dry-run"])
					latestRevision.copyTo(name,localRevision);
			}

			for (let revision of remoteRevisions) {
				if (!revision.getFileInfoByPath(name)) {
					let index=1+remoteRevisions.indexOf(revision);
					console.log("  -> "+index+"  "+name);

					if (!options["dry-run"])
						localRevision.copyTo(name,revision);
				}
			}
		}
	}
};

module.exports=RcRepo;