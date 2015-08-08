Game.Loader.XML.Parser.CharacterParser = function(loader)
{
    Game.Loader.XML.Parser.call(this, loader);
}

Engine.Util.extend(Game.Loader.XML.Parser.CharacterParser, Game.Loader.XML.Parser);

Game.Loader.XML.Parser.CharacterParser.prototype.getTrait = function(traitNode)
{
    var source = traitNode.attr('source');
    var ref = Game.traits[source] ? Game.traits[source] : Engine.traits[source];

    switch (ref.prototype.NAME) {
        case 'contactDamager':
            return {
                'ref': ref,
                'prop': {
                    'points': this.getFloat(traitNode, 'points'),
                }
            }
            break;

        case 'jump':
            return {
                'ref': ref,
                'prop': {
                    'duration': this.getFloat(traitNode, 'duration'),
                    'force': this.getFloat(traitNode, 'force'),
                }
            }
            break;

        case 'health':
            return {
                'ref': ref,
                'prop': {
                    'max': this.getFloat(traitNode, 'max'),
                }
            }
            break;

        case 'invincibility':
            return {
                'ref': ref,
                'prop': {
                    'duration': this.getFloat(traitNode, 'duration'),
                }
            }
            break;

        case 'physics':
            return {
                'ref': ref,
                'prop': {
                    'mass': this.getFloat(traitNode, 'mass'),
                }
            }
            break;

        case 'weapon':
            return {
                'ref': ref,
                'prop': {
                    'projectileEmitOffset': this.getVector2(traitNode.find('> projectile-emit-offset')),
                }
            }
            break;

        default:
            return {
                'ref': ref,
            }
            break;
    }
}

Game.Loader.XML.Parser.CharacterParser.prototype.parse = function(characterNode)
{
    if (!characterNode.is('character')) {
        throw new TypeError("Not <character> node");
    }
    var parser = this;
    var loader = parser.loader;
    var game = loader.game;

    var modelNode = characterNode.find('> model');
    var modelSize = parser.getVector2(modelNode, 'w', 'h');

    var animator = new Engine.Animator.UV();
    var defaultTextureId = undefined;

    modelNode.find('> textures > texture').each(function() {
        var textureNode = $(this);
        var textureSize = parser.getVector2(textureNode, 'w', 'h');
        var texture = parser.getTexture(textureNode);

        var textureId = textureNode.attr('id');
        if (!textureId) {
            throw new Error("No id attribute on " + textureNode[0].outerHTML);
        }

        if (defaultTextureId === undefined) {
            defaultTextureId = textureId;
        }

        var defaultAnimation = undefined;
        textureNode.find('> animations > animation').each(function() {
            var animationNode = $(this);
            var animation = animator.createAnimation(animationNode.attr('id'), animationNode.attr('group'));
            animationNode.find('> frame').each(function() {
                var frameNode = $(this);
                var frameOffset = parser.getVector2(frameNode);

                var uvMap = Engine.SpriteManager.createUVMap(frameOffset.x, frameOffset.y,
                                                             modelSize.x, modelSize.y,
                                                             textureSize.x, textureSize.y);
                var duration = parseFloat(frameNode.attr('duration')) || undefined;
                animation.addFrame(uvMap, duration);
            });
            if ('true' === animationNode.attr('default')) {
                animator.setAnimation(animation);
            }
        });
    });

    var collision = [];
    modelNode.find('> collision > rect').each(function() {
        var rectNode = $(this);
        collision.push(parser.getRect(rectNode));
    });

    loader = undefined;

    var traits = parser.parseTraits(characterNode);

    var sourceName = characterNode.attr('source');
    if (sourceName) {
        var source = Game.objects.characters[sourceName];
    }
    else {
        var source = Game.objects.Character;
    }


    var constructor = function()
    {
        this._parentName = sourceName;
        this.geometry = new THREE.PlaneGeometry(modelSize.x, modelSize.y);
        this.material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            map: game.resource.get('texture', defaultTextureId),
            transparent: true,
        });

        source.call(this);

        for (var i in traits) {
            var trait = new traits[i].ref();
            for (var p in traits[i].prop) {
                var prop = traits[i].prop[p];
                if (prop !== undefined) {
                    trait[p] = prop;
                }
            }
            this[trait.NAME] = this.applyTrait(trait);
        }

        this.animator = new Engine.Animator.UV();
        this.animator.copy(animator);
        this.animator.addGeometry(this.model.geometry);

        for (var i in collision) {
            var r = collision[i];
            this.addCollisionRect(r.w, r.h, r.x, r.y);
        }
    }

    Engine.Util.extend(constructor, source);

    this.callback(constructor);
}

Game.Loader.XML.Parser.CharacterParser.prototype.parseTraits = function(characterNode)
{
    var parser = this;
    var traits = [];

    characterNode.find('> traits > trait').each(function() {
        traits.push(parser.getTrait($(this)));
    });

    return traits;
}
