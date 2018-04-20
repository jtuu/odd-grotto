const devEnv = process.env.FUSEBOX_ENV === "dev";
const prodEnv = !devEnv;

const {
	FuseBox,
  QuantumPlugin,
	WebIndexPlugin,
	JSONPlugin,
	BabelPlugin,
	UglifyESPlugin,
	CSSPlugin
} = require("fuse-box");
const { src, task, watch, context, fuse } = require("fuse-box/sparky");
const {MacroPlugin} = require("./lib/MacroPlugin");
const {basename} = require("path");
const pkg = require("./package");

const mainFileName = basename(pkg.main);

context(class {
	getConfig() {
		const fuse = FuseBox.init({
			package: {
				name: pkg.name,
				entry: mainFileName
			},
			homeDir: "src",
			target: "browser@es2017",
			output: "public/$name.js",
			allowSyntheticDefaultImports: true,
			plugins: [
				JSONPlugin(),
				CSSPlugin(),
				
				MacroPlugin({
					defineFilePath: "lib/defines.m4",
					ignoreFiles: [
						"Assert.ts",
						"Globals.ts"
					]
				}),
				
				BabelPlugin({
					config: {
						sourceMaps: true,
						presets: ["es2017", "stage-3"],
						plugins: [
							"transform-react-jsx"
						]
					},
					test: /\.tsx?$/,
					extensions: [".js"]
				}),
				WebIndexPlugin({
					path: ".",
					template: "src/index.html"
				}),
				prodEnv && QuantumPlugin({
					ensureES5: false
				}),
				prodEnv && UglifyESPlugin()
			],
			log: devEnv,
			debug: devEnv
		});

		const app = fuse.bundle("main").instructions("> main.ts");

		if (devEnv) {
			fuse.dev({
				port: 3000
			});
			app.hmr().watch();
		}

		return fuse;
	}

	async buildWorkers() {
		const workerConfig = FuseBox.init({
			homeDir: "src",
			target: "browser@es2017",
			output: "public/$name.js",
			allowSyntheticDefaultImports: true,
			plugins: [
				JSONPlugin(),
				prodEnv && QuantumPlugin({
					ensureES5: false,
					containedAPI: true,
					bakeApiIntoBundle: "workers"
				}),
				prodEnv && UglifyESPlugin()
			],
			log: devEnv,
			debug: devEnv
		});

		const workers = [
			"DecompressorWorker",
			"CompressorWorker"
		];

		workers.forEach(w => {
			const bundle = workerConfig.bundle(w).instructions(`> ${w}.ts`);
			if (devEnv) {
				bundle.watch();
			}
		});

		await workerConfig.run();
	}
});

task("default", async context => {
	context.buildWorkers();
	const fuse = context.getConfig();
	await fuse.run();
});
