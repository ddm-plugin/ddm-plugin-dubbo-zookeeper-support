class DubboConfigurationUtils {


    addDisableProvider(doc, address) {
        let find = false;
        for (let i = 0; i < doc.configs.length; i++) {
            let config = doc.configs[i];
            let { side, addresses  } = config;

            if (side != "provider") continue;

            if (addresses && addresses.length == 1 && addresses[0] == address) {
                config.enabled = true;
                if (!config.parameters) config.parameters = [];

                config.parameters.disabled = true;
                find = true;
                break;
            }
        }

        if (!find) {
            doc.configs.push({
                addresses: [address],
                enabled: true,
                parameters: {
                    disabled: true
                },
                side: "provider"
            });
        }

        return doc;
    }

    removeDisableProvider(doc, address) {
        for (let i = 0; i < doc.configs.length; i++) {
            const config = doc.configs[i];
            const {
                side,
                addresses
            } = config;

            if (side != "provider") {
                continue;
            }

            // 不是禁用的规则，忽略
            if (!config.parameters || !config.parameters.disabled) {
                continue;
            }

            for (let i = 0; i < addresses.length; i++) {
                if (addresses[i] === address) {
                    addresses.splice(i, 1);
                }
            }

            if (addresses.length == 0) {
                doc.configs.splice(i, 1);
            }

        }

        if (doc.configs.length == 0) {
            return {};
        }

        return doc;
    }


    createDubboDefaultConfiguration(serviceName) {
        const doc = {
            configVersion: "v2.7",
            key: serviceName,
            scope: "service",
            enabled: true,
            configs: []
        }
        return doc;
    }

    /**
     * 获取被禁用的提供者地址列表
     * @param {string} serviceName 
     * @param {string[]} versions 多个版本
     */
    async getDisableAddresses(doc) {
        if (!doc || !doc.configs) {
            return [];
        }

        let addressList = [];
        for (let j = 0; j < doc.configs.length; j++) {
            const config = doc.configs[j];
            // 规则不是开启的，忽略
            if (!config.enabled) {
                continue;
            }

            if (!config.parameters || !config.parameters.disabled || config.parameters.disabled != true) {
                continue;
            }

            addressList = addressList.concat(config.addresses);
        }
        return addressList;
    }
}

export default new DubboConfigurationUtils();