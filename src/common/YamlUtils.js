import yaml from "js-yaml";


class YamlUtils {

  yamlToJSON(data) {
    if (!data) {
      return null;
    }

    return yaml.load(data.toString("utf8"));
  }

  JSONToYaml(doc) {
    return yaml.dump(doc);
  }

}

export default new YamlUtils();