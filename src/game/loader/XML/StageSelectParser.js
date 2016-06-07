'use strict';

Game.Loader.XML.Parser.StageSelectParser =
class StageSelectParser
extends Game.Loader.XML.Parser
{
    constructor(loader)
    {
        super(loader);
        this._scene = new Game.scenes.StageSelect();
        this.sceneParser = new Game.Loader.XML.Parser.SceneParser(loader, this._scene);
    }
    parseStageSelect(sceneNode)
    {
        if (sceneNode.tagName !== 'scene' || sceneNode.getAttribute('type') !== 'stage-select') {
            throw new TypeError('Node not <scene type="stage-select">');
        }

        return new Promise(resolve => {
            const scene = this._scene;

            this.sceneParser.parseAudio(sceneNode);
            this.sceneParser.parseEvents(sceneNode);

            var objectsNode = sceneNode.getElementsByTagName('objects')[0];
            var objectParser = new Game.Loader.XML.Parser.ObjectParser(this.loader);
            var objects = objectParser.parse(objectsNode);

            var backgroundNode = sceneNode.getElementsByTagName('background')[0];
            scene.setBackgroundColor(backgroundNode.getAttribute('color'));

            var cameraNode = sceneNode.getElementsByTagName('camera')[0];
            scene.cameraDistance = parseFloat(cameraNode.getAttribute('distance')) || scene.cameraDistance;

            var indicatorNode = sceneNode.getElementsByTagName('indicator')[0];
            scene.setIndicator(new objects['indicator']().model);
            scene.indicatorInterval = parseFloat(indicatorNode.getAttribute('blink-interval')) || scene.indicatorInterval;

            scene.setFrame(new objects['frame']().model);

            var stagesNode = sceneNode.getElementsByTagName('stage');
            scene.rowLength = Math.ceil(Math.sqrt(stagesNode.length));
            for (var stageNode, i = 0; stageNode = stagesNode[i++];) {
                var id = stageNode.getAttribute('id');
                var avatar = new objects[id]().model;
                var name = stageNode.getAttribute('name');
                var caption = this.createCaption(stageNode.getAttribute('caption'));
                scene.addStage(avatar, caption, name);
            }

            const stageSelectScene = scene;
            const initialIndex = parseFloat(indicatorNode.getAttribute('initial-index'));
            scene.events.bind(scene.EVENT_CREATE, () => {
                scene.equalize(initialIndex);
            });
            scene.events.bind(scene.EVENT_STAGE_ENTER, (stage, index) => {
                this.loader.startScene(stage.name).then((scene) => {
                    scene.events.bind(scene.EVENT_END, () => {
                        this.loader.game.setScene(stageSelectScene);
                    });
                });
            });

            this.loader.resourceLoader.complete().then(() => {
                resolve(scene);
            });
        });
    }
    createCaption(text) {
        text = text.split(" ");
        text[1] = Engine.Util.string.fill(" ", 6 - text[1].length) + text[1];
        text = text.join("\n");
        return this.loader.resourceManager.get('font', 'nintendo')(text).createMesh();
    }
}
