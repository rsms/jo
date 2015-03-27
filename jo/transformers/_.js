// common (_.js is a hack for now while using hacky bash script to compile pkgs)
import recast from 'recast'
import {JSIdentifier, SrcError, SrcLocation, repr} from '../util'

var types = recast.types;
var B = types.builders;
var T = types.namedTypes;
