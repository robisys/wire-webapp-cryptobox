/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

System.trace = true;

window.showModuleRelationships = function() {
  var modules = Object.keys(System.loads)
    .map(function(moduleName) {
      return System.loads[moduleName];
    });

  function displayName(module) {
    return module.replace(System.baseURL, "");
  }

  var moduleDefinitions = modules.map(function(module) {
    var name = displayName(module.name);
    return `[${name}|${module.metadata.format}]`;
  });

  var dependencyDefinitions = [];

  modules
    .filter(function(module) {
      return module.deps.length > 0;
    })
    .forEach(function(module) {
      var name = displayName(module.name);

      var dependencies = module.deps
        .map(function(dependency) {
          return System.normalizeSync(dependency, module.name, module.address)
        })
        .map(displayName)
        .map(function(dependencyName) {
          return "[" + name + "]->[" + dependencyName + "]"
        });

      dependencyDefinitions = dependencyDefinitions.concat(dependencies);
    });

  var definitions = moduleDefinitions.concat(dependencyDefinitions);

  window.open("http://yuml.me/diagram/plain/class/" + definitions);

};
