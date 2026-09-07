"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
class ComponentTools {
    getTools() {
        return [
            {
                name: 'add_component',
                description: 'Add a component to a specific node. IMPORTANT: You must provide the nodeUuid parameter to specify which node to add the component to.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID. REQUIRED: You must specify the exact node to add the component to. Use get_all_nodes or find_node_by_name to get the UUID of the desired node.'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type (e.g., cc.Sprite, cc.Label, cc.Button)'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'remove_component',
                description: 'Remove a component from a node. componentType must be the component\'s classId (cid, i.e. the type field from getComponents), not the script name or class name. Use getComponents to get the correct cid.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component cid (type field from getComponents). Do NOT use script name or class name. Example: "cc.Sprite" or "9b4a7ueT9xD6aRE+AlOusy1"'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'get_components',
                description: 'Get all components of a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'get_component_info',
                description: 'Get specific component information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type to get info for'
                        }
                    },
                    required: ['nodeUuid', 'componentType']
                }
            },
            {
                name: 'set_component_property',
                description: 'Set component property values for UI components or custom script components. Supports setting properties of built-in UI components (e.g., cc.Label, cc.Sprite) and custom script components. Note: For node basic properties (name, active, layer, etc.), use set_node_property. For node transform properties (position, rotation, scale, etc.), use set_node_transform.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID - Must specify the node to operate on'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type - Can be built-in components (e.g., cc.Label) or custom script components (e.g., MyScript). If unsure about component type, use get_components first to retrieve all components on the node.',
                            // 移除enum限制，允许任意组件类型包括自定义脚本
                        },
                        property: {
                            type: 'string',
                            description: 'Property name - The property to set. Common properties include:\n' +
                                '• cc.Label: string (text content), fontSize (font size), color (text color)\n' +
                                '• cc.Sprite: spriteFrame (sprite frame), color (tint color), sizeMode (size mode)\n' +
                                '• cc.Button: normalColor (normal color), pressedColor (pressed color), target (target node)\n' +
                                '• cc.UITransform: contentSize (content size), anchorPoint (anchor point)\n' +
                                '• Custom Scripts: Based on properties defined in the script'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Property type - Must explicitly specify the property data type for correct value conversion and validation',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray'
                            ]
                        },
                        value: {
                            description: 'Property value - Use the corresponding data format based on propertyType:\n\n' +
                                '📝 Basic Data Types:\n' +
                                '• string: "Hello World" (text string)\n' +
                                '• number/integer/float: 42 or 3.14 (numeric value)\n' +
                                '• boolean: true or false (boolean value)\n\n' +
                                '🎨 Color Type:\n' +
                                '• color: {"r":255,"g":0,"b":0,"a":255} (RGBA values, range 0-255)\n' +
                                '  - Alternative: "#FF0000" (hexadecimal format)\n' +
                                '  - Transparency: a value controls opacity, 255 = fully opaque, 0 = fully transparent\n\n' +
                                '📐 Vector and Size Types:\n' +
                                '• vec2: {"x":100,"y":50} (2D vector)\n' +
                                '• vec3: {"x":1,"y":2,"z":3} (3D vector)\n' +
                                '• size: {"width":100,"height":50} (size dimensions)\n\n' +
                                '🔗 Reference Types (using UUID strings):\n' +
                                '• node: "target-node-uuid" (node reference)\n' +
                                '  How to get: Use get_all_nodes or find_node_by_name to get node UUIDs\n' +
                                '• component: "target-node-uuid" (component reference)\n' +
                                '  How it works: \n' +
                                '    1. Provide the UUID of the NODE that contains the target component\n' +
                                '    2. System auto-detects required component type from property metadata\n' +
                                '    3. Finds the component on target node and gets its scene __id__\n' +
                                '    4. Sets reference using the scene __id__ (not node UUID)\n' +
                                '  Example: value="label-node-uuid" will find cc.Label and use its scene ID\n' +
                                '• spriteFrame: "spriteframe-uuid" (sprite frame asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• prefab: "prefab-uuid" (prefab asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• asset: "asset-uuid" (generic asset reference)\n' +
                                '  How to get: Check asset database or use asset browser\n\n' +
                                '📋 Array Types:\n' +
                                '• nodeArray: ["uuid1","uuid2"] (array of node UUIDs)\n' +
                                '• colorArray: [{"r":255,"g":0,"b":0,"a":255}] (array of colors)\n' +
                                '• numberArray: [1,2,3,4,5] (array of numbers)\n' +
                                '• stringArray: ["item1","item2"] (array of strings)'
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'property', 'propertyType', 'value']
                }
            },
            {
                name: 'attach_script',
                description: 'Attach a script component to a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID'
                        },
                        scriptPath: {
                            type: 'string',
                            description: 'Script asset path (e.g., db://assets/scripts/MyScript.ts)'
                        }
                    },
                    required: ['nodeUuid', 'scriptPath']
                }
            },
            {
                name: 'get_available_components',
                description: 'Get list of available component types',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Component category filter',
                            enum: ['all', 'renderer', 'ui', 'physics', 'animation', 'audio'],
                            default: 'all'
                        }
                    }
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add_component':
                return await this.addComponent(args.nodeUuid, args.componentType);
            case 'remove_component':
                return await this.removeComponent(args.nodeUuid, args.componentType);
            case 'get_components':
                return await this.getComponents(args.nodeUuid);
            case 'get_component_info':
                return await this.getComponentInfo(args.nodeUuid, args.componentType);
            case 'set_component_property':
                return await this.setComponentProperty(args);
            case 'attach_script':
                return await this.attachScript(args.nodeUuid, args.scriptPath);
            case 'get_available_components':
                return await this.getAvailableComponents(args.category);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async addComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a;
            // 先查找节点上是否已存在该组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (allComponentsInfo.success && ((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                const existingComponent = allComponentsInfo.data.components.find((comp) => comp.type === componentType);
                if (existingComponent) {
                    resolve({
                        success: true,
                        message: `Component '${componentType}' already exists on node`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentType: componentType,
                            componentVerified: true,
                            existing: true
                        }
                    });
                    return;
                }
            }
            // 尝试直接使用 Editor API 添加组件
            Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType
            }).then(async (result) => {
                var _a;
                // 等待一段时间让Editor完成组件添加
                await new Promise(resolve => setTimeout(resolve, 100));
                // 重新查询节点信息验证组件是否真的添加成功
                try {
                    const allComponentsInfo2 = await this.getComponents(nodeUuid);
                    if (allComponentsInfo2.success && ((_a = allComponentsInfo2.data) === null || _a === void 0 ? void 0 : _a.components)) {
                        const addedComponent = allComponentsInfo2.data.components.find((comp) => comp.type === componentType);
                        if (addedComponent) {
                            resolve({
                                success: true,
                                message: `Component '${componentType}' added successfully`,
                                data: {
                                    nodeUuid: nodeUuid,
                                    componentType: componentType,
                                    componentVerified: true,
                                    existing: false
                                }
                            });
                        }
                        else {
                            resolve({
                                success: false,
                                error: `Component '${componentType}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                            });
                        }
                    }
                    else {
                        resolve({
                            success: false,
                            error: `Failed to verify component addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                        });
                    }
                }
                catch (verifyError) {
                    resolve({
                        success: false,
                        error: `Failed to verify component addition: ${verifyError.message}`
                    });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'addComponentToNode',
                    args: [nodeUuid, componentType]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    resolve(result);
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    async removeComponent(nodeUuid, componentType) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            // 1. 查找节点上的所有组件
            const allComponentsInfo = await this.getComponents(nodeUuid);
            if (!allComponentsInfo.success || !((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
                resolve({ success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` });
                return;
            }
            // 2. 只查找type字段等于componentType的组件（即cid）
            const component = allComponentsInfo.data.components.find((comp) => comp.type === componentType);
            if (!component) {
                resolve({ success: false, error: `Component cid '${componentType}' not found on node '${nodeUuid}'. 请用getComponents获取type字段（cid）作为componentType。` });
                return;
            }
            if (!component.uuid) {
                resolve({ success: false, error: `Component cid '${componentType}' on node '${nodeUuid}' has no instance UUID.` });
                return;
            }
            // 3. 官方API直接移除
            try {
                await Editor.Message.request('scene', 'remove-component', {
                    uuid: component.uuid
                });
                // 4. 再查一次确认是否移除
                const afterRemoveInfo = await this.getComponents(nodeUuid);
                const stillExists = afterRemoveInfo.success && ((_c = (_b = afterRemoveInfo.data) === null || _b === void 0 ? void 0 : _b.components) === null || _c === void 0 ? void 0 : _c.some((comp) => comp.type === componentType));
                if (stillExists) {
                    resolve({ success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'.` });
                }
                else {
                    resolve({
                        success: true,
                        message: `Component cid '${componentType}' removed successfully from node '${nodeUuid}'`,
                        data: { nodeUuid, componentType }
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: `Failed to remove component: ${err.message}` });
            }
        });
    }
    async getComponents(nodeUuid) {
        return new Promise((resolve) => {
            // 优先尝试直接使用 Editor API 查询节点信息
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (nodeData && nodeData.__comps__) {
                    const components = nodeData.__comps__.map((comp) => {
                        var _a, _b, _c, _d, _e, _f;
                        return ({
                            type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                            uuid: (_c = this.readDumpValue((_b = (_a = comp.value) === null || _a === void 0 ? void 0 : _a.uuid) !== null && _b !== void 0 ? _b : comp.uuid)) !== null && _c !== void 0 ? _c : null,
                            enabled: (_f = this.readDumpValue((_e = (_d = comp.value) === null || _d === void 0 ? void 0 : _d.enabled) !== null && _e !== void 0 ? _e : comp.enabled)) !== null && _f !== void 0 ? _f : true,
                            properties: this.extractComponentProperties(comp)
                        });
                    });
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            components: components
                        }
                    });
                }
                else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    if (result.success) {
                        resolve({
                            success: true,
                            data: result.data.components
                        });
                    }
                    else {
                        resolve(result);
                    }
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    async getComponentInfo(nodeUuid, componentType) {
        return new Promise((resolve) => {
            // 优先尝试直接使用 Editor API 查询节点信息
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData) => {
                if (nodeData && nodeData.__comps__) {
                    const component = nodeData.__comps__.find((comp) => {
                        const compType = comp.__type__ || comp.cid || comp.type;
                        return compType === componentType;
                    });
                    if (component) {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                enabled: component.enabled !== undefined ? component.enabled : true,
                                properties: this.extractComponentProperties(component)
                            }
                        });
                    }
                    else {
                        resolve({ success: false, error: `Component '${componentType}' not found on node` });
                    }
                }
                else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err) => {
                // 备用方案：使用场景脚本
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };
                Editor.Message.request('scene', 'execute-scene-script', options).then((result) => {
                    if (result.success && result.data.components) {
                        const component = result.data.components.find((comp) => comp.type === componentType);
                        if (component) {
                            resolve({
                                success: true,
                                data: Object.assign({ nodeUuid: nodeUuid, componentType: componentType }, component)
                            });
                        }
                        else {
                            resolve({ success: false, error: `Component '${componentType}' not found on node` });
                        }
                    }
                    else {
                        resolve({ success: false, error: result.error || 'Failed to get component info' });
                    }
                }).catch((err2) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }
    extractComponentProperties(component) {
        console.log(`[extractComponentProperties] Processing component:`, Object.keys(component));
        // 检查组件是否有 value 属性，这通常包含实际的组件属性
        if (component.value && typeof component.value === 'object') {
            console.log(`[extractComponentProperties] Found component.value with properties:`, Object.keys(component.value));
            return component.value; // 直接返回 value 对象，它包含所有组件属性
        }
        // 备用方案：从组件对象中直接提取属性
        const properties = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                console.log(`[extractComponentProperties] Found direct property '${key}':`, typeof component[key]);
                properties[key] = component[key];
            }
        }
        console.log(`[extractComponentProperties] Final extracted properties:`, Object.keys(properties));
        return properties;
    }
    readDumpValue(value) {
        if (value && typeof value === 'object' && 'value' in value) {
            return value.value;
        }
        return value;
    }
    async findComponentTypeByUuid(componentUuid) {
        var _a;
        console.log(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree) {
                console.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }
            const queue = [nodeTree];
            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }
                try {
                    const fullNodeData = await Editor.Message.request('scene', 'query-node', currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                console.log(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${(_a = fullNodeData.name) === null || _a === void 0 ? void 0 : _a.value}`);
                                return componentType;
                            }
                        }
                    }
                }
                catch (e) {
                    console.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}:`, e);
                }
                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }
            console.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        }
        catch (error) {
            console.error(`[findComponentTypeByUuid] Error while searching for component type:`, error);
            return null;
        }
    }
    async setComponentProperty(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        return new Promise(async (resolve) => {
            var _a, _b, _c, _d, _e, _f;
            try {
                console.log(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);
                // Step 0: 检测是否为节点属性，如果是则重定向到对应的节点方法
                const nodeRedirectResult = await this.checkAndRedirectNodeProperties(args);
                if (nodeRedirectResult) {
                    resolve(nodeRedirectResult);
                    return;
                }
                // Step 1: 获取组件信息，使用与getComponents相同的方法
                const componentsResponse = await this.getComponents(nodeUuid);
                if (!componentsResponse.success || !componentsResponse.data) {
                    resolve({
                        success: false,
                        error: `Failed to get components for node '${nodeUuid}': ${componentsResponse.error}`,
                        instruction: `Please verify that node UUID '${nodeUuid}' is correct. Use get_all_nodes or find_node_by_name to get the correct node UUID.`
                    });
                    return;
                }
                const allComponents = componentsResponse.data.components;
                // Step 2: 查找目标组件
                let targetComponent = null;
                const availableTypes = [];
                for (let i = 0; i < allComponents.length; i++) {
                    const comp = allComponents[i];
                    availableTypes.push(comp.type);
                    if (comp.type === componentType) {
                        targetComponent = comp;
                        break;
                    }
                }
                if (!targetComponent) {
                    // 提供更详细的错误信息和建议
                    const instruction = this.generateComponentSuggestion(componentType, availableTypes, property);
                    resolve({
                        success: false,
                        error: `Component '${componentType}' not found on node. Available components: ${availableTypes.join(', ')}`,
                        instruction: instruction
                    });
                    return;
                }
                // Step 3: 自动检测和转换属性值
                let propertyInfo;
                try {
                    console.log(`[ComponentTools] Analyzing property: ${property}`);
                    propertyInfo = this.analyzeProperty(targetComponent, property);
                }
                catch (analyzeError) {
                    console.error(`[ComponentTools] Error in analyzeProperty:`, analyzeError);
                    resolve({
                        success: false,
                        error: `Failed to analyze property '${property}': ${analyzeError.message}`
                    });
                    return;
                }
                if (!propertyInfo.exists) {
                    resolve({
                        success: false,
                        error: `Property '${property}' not found on component '${componentType}'. Available properties: ${propertyInfo.availableProperties.join(', ')}`
                    });
                    return;
                }
                // Step 4: 处理属性值和设置
                const originalValue = propertyInfo.originalValue;
                let processedValue;
                // 根据明确的propertyType处理属性值
                switch (propertyType) {
                    case 'string':
                        processedValue = String(value);
                        break;
                    case 'number':
                    case 'integer':
                    case 'float':
                        processedValue = Number(value);
                        break;
                    case 'boolean':
                        processedValue = Boolean(value);
                        break;
                    case 'color':
                        if (typeof value === 'string') {
                            // 字符串格式：支持十六进制、颜色名称、rgb()/rgba()
                            processedValue = this.parseColorString(value);
                        }
                        else if (typeof value === 'object' && value !== null) {
                            // 对象格式：验证并转换RGBA值
                            processedValue = {
                                r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                                a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                            };
                        }
                        else {
                            throw new Error('Color value must be an object with r, g, b properties or a hexadecimal string (e.g., "#FF0000")');
                        }
                        break;
                    case 'vec2':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0
                            };
                        }
                        else {
                            throw new Error('Vec2 value must be an object with x, y properties');
                        }
                        break;
                    case 'vec3':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0,
                                z: Number(value.z) || 0
                            };
                        }
                        else {
                            throw new Error('Vec3 value must be an object with x, y, z properties');
                        }
                        break;
                    case 'size':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                width: Number(value.width) || 0,
                                height: Number(value.height) || 0
                            };
                        }
                        else {
                            throw new Error('Size value must be an object with width, height properties');
                        }
                        break;
                    case 'node':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error('Node reference value must be a string UUID');
                        }
                        break;
                    case 'component':
                        if (typeof value === 'string') {
                            // 组件引用需要特殊处理：通过节点UUID找到组件的__id__
                            processedValue = value; // 先保存节点UUID，后续会转换为__id__
                        }
                        else {
                            throw new Error('Component reference value must be a string (node UUID containing the target component)');
                        }
                        break;
                    case 'spriteFrame':
                    case 'prefab':
                    case 'asset':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        }
                        else {
                            throw new Error(`${propertyType} value must be a string UUID`);
                        }
                        break;
                    case 'nodeArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                }
                                else {
                                    throw new Error('NodeArray items must be string UUIDs');
                                }
                            });
                        }
                        else {
                            throw new Error('NodeArray value must be an array');
                        }
                        break;
                    case 'colorArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => {
                                if (typeof item === 'object' && item !== null && 'r' in item) {
                                    return {
                                        r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                        g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                        b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                        a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                    };
                                }
                                else {
                                    return { r: 255, g: 255, b: 255, a: 255 };
                                }
                            });
                        }
                        else {
                            throw new Error('ColorArray value must be an array');
                        }
                        break;
                    case 'numberArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => Number(item));
                        }
                        else {
                            throw new Error('NumberArray value must be an array');
                        }
                        break;
                    case 'stringArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item) => String(item));
                        }
                        else {
                            throw new Error('StringArray value must be an array');
                        }
                        break;
                    default:
                        throw new Error(`Unsupported property type: ${propertyType}`);
                }
                console.log(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${propertyType})`);
                console.log(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${propertyType}"`);
                console.log(`[ComponentTools] Will use color special handling: ${propertyType === 'color' && processedValue && typeof processedValue === 'object'}`);
                // 用于验证的实际期望值（对于组件引用需要特殊处理）
                let actualExpectedValue = processedValue;
                // Step 5: 获取原始节点数据来构建正确的路径
                const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!rawNodeData || !rawNodeData.__comps__) {
                    resolve({
                        success: false,
                        error: `Failed to get raw node data for property setting`
                    });
                    return;
                }
                // 找到原始组件的索引
                let rawComponentIndex = -1;
                for (let i = 0; i < rawNodeData.__comps__.length; i++) {
                    const comp = rawNodeData.__comps__[i];
                    const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                    if (compType === componentType) {
                        rawComponentIndex = i;
                        break;
                    }
                }
                if (rawComponentIndex === -1) {
                    resolve({
                        success: false,
                        error: `Could not find component index for setting property`
                    });
                    return;
                }
                const rawComponent = rawNodeData.__comps__[rawComponentIndex];
                const uiTransformSerializedProperties = {
                    contentSize: '_contentSize',
                    anchorPoint: '_anchorPoint',
                };
                const serializedProperty = componentType === 'cc.UITransform'
                    ? uiTransformSerializedProperties[property] || property
                    : property;
                const rawPropertyDump = ((_a = rawComponent.value) === null || _a === void 0 ? void 0 : _a[property])
                    || ((_b = rawComponent.value) === null || _b === void 0 ? void 0 : _b[serializedProperty])
                    || ((_c = rawComponent.properties) === null || _c === void 0 ? void 0 : _c[property])
                    || ((_d = rawComponent.properties) === null || _d === void 0 ? void 0 : _d[serializedProperty]);
                const propertyTargetUuid = nodeUuid;
                const propertyPath = (rawPropertyDump === null || rawPropertyDump === void 0 ? void 0 : rawPropertyDump.path)
                    || `__comps__.${rawComponentIndex}.${serializedProperty}`;
                // Match the Creator Inspector transaction boundary. Without a
                // recording transaction, scene:set-property can update the live
                // value without registering a Prefab override for apply-prefab.
                const undoId = await Editor.Message.request('scene', 'begin-recording', [nodeUuid]);
                try {
                    // 特殊处理资源类属性
                    if (propertyType === 'asset' || propertyType === 'spriteFrame' || propertyType === 'prefab' ||
                        (propertyInfo.type === 'asset' && propertyType === 'string')) {
                        console.log(`[ComponentTools] Setting asset reference:`, {
                            value: processedValue,
                            property: property,
                            propertyType: propertyType,
                            path: propertyPath
                        });
                        // Determine asset type based on property name
                        let assetType = 'cc.SpriteFrame'; // default
                        if (property.toLowerCase().includes('texture')) {
                            assetType = 'cc.Texture2D';
                        }
                        else if (property.toLowerCase().includes('material')) {
                            assetType = 'cc.Material';
                        }
                        else if (property.toLowerCase().includes('font')) {
                            assetType = 'cc.Font';
                        }
                        else if (property.toLowerCase().includes('clip')) {
                            assetType = 'cc.AudioClip';
                        }
                        else if (propertyType === 'prefab') {
                            assetType = 'cc.Prefab';
                        }
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: processedValue,
                                type: assetType
                            }
                        });
                    }
                    else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                        // 特殊处理颜色属性，确保RGBA值正确
                        // Cocos Creator颜色值范围是0-255
                        const colorValue = {
                            r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                            g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                            b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                            a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                        };
                        console.log(`[ComponentTools] Setting color value:`, colorValue);
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: colorValue,
                                type: 'cc.Color'
                            }
                        });
                    }
                    else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                        // 特殊处理Vec3属性
                        const vec3Value = {
                            x: Number(processedValue.x) || 0,
                            y: Number(processedValue.y) || 0,
                            z: Number(processedValue.z) || 0
                        };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: vec3Value,
                                type: 'cc.Vec3'
                            }
                        });
                    }
                    else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                        // 特殊处理Vec2属性
                        const vec2Value = {
                            x: Number(processedValue.x) || 0,
                            y: Number(processedValue.y) || 0
                        };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: vec2Value,
                                type: 'cc.Vec2'
                            }
                        });
                    }
                    else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                        // 特殊处理Size属性
                        const sizeValue = {
                            width: Number(processedValue.width) || 0,
                            height: Number(processedValue.height) || 0
                        };
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: sizeValue,
                                type: 'cc.Size'
                            }
                        });
                    }
                    else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                        // 特殊处理节点引用
                        console.log(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: processedValue,
                                type: 'cc.Node'
                            }
                        });
                    }
                    else if (propertyType === 'component' && typeof processedValue === 'string') {
                        // 特殊处理组件引用：通过节点UUID找到组件的__id__
                        const targetNodeUuid = processedValue;
                        console.log(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);
                        // 从当前组件的属性元数据中获取期望的组件类型
                        let expectedComponentType = '';
                        // 获取当前组件的详细信息，包括属性元数据
                        const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                        if (currentComponentInfo.success && ((_f = (_e = currentComponentInfo.data) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f[property])) {
                            const propertyMeta = currentComponentInfo.data.properties[property];
                            // 从属性元数据中提取组件类型信息
                            if (propertyMeta && typeof propertyMeta === 'object') {
                                // 检查是否有type字段指示组件类型
                                if (propertyMeta.type) {
                                    expectedComponentType = propertyMeta.type;
                                }
                                else if (propertyMeta.ctor) {
                                    // 有些属性可能使用ctor字段
                                    expectedComponentType = propertyMeta.ctor;
                                }
                                else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
                                    // 检查extends数组，通常第一个是最具体的类型
                                    for (const extendType of propertyMeta.extends) {
                                        if (extendType.startsWith('cc.') && extendType !== 'cc.Component' && extendType !== 'cc.Object') {
                                            expectedComponentType = extendType;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (!expectedComponentType) {
                            throw new Error(`Unable to determine required component type for property '${property}' on component '${componentType}'. Property metadata may not contain type information.`);
                        }
                        console.log(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);
                        try {
                            // 获取目标节点的组件信息
                            const targetNodeData = await Editor.Message.request('scene', 'query-node', targetNodeUuid);
                            if (!targetNodeData || !targetNodeData.__comps__) {
                                throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                            }
                            // 打印目标节点的组件概览
                            console.log(`[ComponentTools] Target node ${targetNodeUuid} has ${targetNodeData.__comps__.length} components:`);
                            targetNodeData.__comps__.forEach((comp, index) => {
                                const sceneId = comp.value && comp.value.uuid && comp.value.uuid.value ? comp.value.uuid.value : 'unknown';
                                console.log(`[ComponentTools] Component ${index}: ${comp.type} (scene_id: ${sceneId})`);
                            });
                            // 查找对应的组件
                            let targetComponent = null;
                            let componentId = null;
                            // 在目标节点的_components数组中查找指定类型的组件
                            // 注意：__comps__和_components的索引是对应的
                            console.log(`[ComponentTools] Searching for component type: ${expectedComponentType}`);
                            for (let i = 0; i < targetNodeData.__comps__.length; i++) {
                                const comp = targetNodeData.__comps__[i];
                                console.log(`[ComponentTools] Checking component ${i}: type=${comp.type}, target=${expectedComponentType}`);
                                if (comp.type === expectedComponentType) {
                                    targetComponent = comp;
                                    console.log(`[ComponentTools] Found matching component at index ${i}: ${comp.type}`);
                                    // 从组件的value.uuid.value中获取组件在场景中的ID
                                    if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                        componentId = comp.value.uuid.value;
                                        console.log(`[ComponentTools] Got componentId from comp.value.uuid.value: ${componentId}`);
                                    }
                                    else {
                                        console.log(`[ComponentTools] Component structure:`, {
                                            hasValue: !!comp.value,
                                            hasUuid: !!(comp.value && comp.value.uuid),
                                            hasUuidValue: !!(comp.value && comp.value.uuid && comp.value.uuid.value),
                                            uuidStructure: comp.value ? comp.value.uuid : 'No value'
                                        });
                                        throw new Error(`Unable to extract component ID from component structure`);
                                    }
                                    break;
                                }
                            }
                            if (!targetComponent) {
                                // 如果没找到，列出可用组件让用户了解，显示场景中的真实ID
                                const availableComponents = targetNodeData.__comps__.map((comp, index) => {
                                    let sceneId = 'unknown';
                                    // 从组件的value.uuid.value获取场景ID
                                    if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                        sceneId = comp.value.uuid.value;
                                    }
                                    return `${comp.type}(scene_id:${sceneId})`;
                                });
                                throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${availableComponents.join(', ')}`);
                            }
                            console.log(`[ComponentTools] Found component ${expectedComponentType} with scene ID: ${componentId} on node ${targetNodeUuid}`);
                            // 更新期望值为实际的组件ID对象格式，用于后续验证
                            if (componentId) {
                                actualExpectedValue = { uuid: componentId };
                            }
                            // 尝试使用与节点/资源引用相同的格式：{uuid: componentId}
                            // 测试看是否能正确设置组件引用
                            await Editor.Message.request('scene', 'set-property', {
                                uuid: propertyTargetUuid,
                                path: propertyPath,
                                dump: {
                                    value: { uuid: componentId }, // 使用对象格式，像节点/资源引用一样
                                    type: expectedComponentType
                                }
                            });
                        }
                        catch (error) {
                            console.error(`[ComponentTools] Error setting component reference:`, error);
                            throw error;
                        }
                    }
                    else if (propertyType === 'nodeArray' && Array.isArray(processedValue)) {
                        // 特殊处理节点数组 - 保持预处理的格式
                        console.log(`[ComponentTools] Setting node array:`, processedValue);
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: processedValue // 保持 [{uuid: "..."}, {uuid: "..."}] 格式
                            }
                        });
                    }
                    else if (propertyType === 'colorArray' && Array.isArray(processedValue)) {
                        // 特殊处理颜色数组
                        const colorArrayValue = processedValue.map((item) => {
                            if (item && typeof item === 'object' && 'r' in item) {
                                return {
                                    r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                    g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                    b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                    a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                };
                            }
                            else {
                                return { r: 255, g: 255, b: 255, a: 255 };
                            }
                        });
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: {
                                value: colorArrayValue,
                                type: 'cc.Color'
                            }
                        });
                    }
                    else {
                        // Normal property setting for non-asset properties
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: propertyTargetUuid,
                            path: propertyPath,
                            dump: { value: processedValue }
                        });
                    }
                }
                catch (setError) {
                    if (undoId) {
                        await Editor.Message.request('scene', 'cancel-recording', undoId);
                    }
                    throw setError;
                }
                if (undoId) {
                    await Editor.Message.request('scene', 'end-recording', undoId);
                }
                // Step 5: 等待Editor完成更新，然后验证设置结果
                await new Promise(resolve => setTimeout(resolve, 200)); // 等待200ms让Editor完成更新
                let verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
                // Some engine properties exposed by Inspector (for example
                // UITransform.contentSize) are accessors backed by differently named
                // serialized fields. scene:set-property may resolve successfully
                // without changing them. For value types, use the extension's scene
                // component setter as a verified fallback so the engine applies the
                // public property contract itself.
                const sceneFallbackTypes = new Set([
                    'string', 'number', 'boolean', 'integer', 'float',
                    'color', 'vec2', 'vec3', 'size',
                    'colorArray', 'numberArray', 'stringArray',
                ]);
                if (!verification.verified && sceneFallbackTypes.has(propertyType)) {
                    const fallbackResult = await Editor.Message.request('scene', 'execute-scene-script', {
                        name: 'cocos-mcp-server',
                        method: 'setComponentProperty',
                        args: [nodeUuid, componentType, property, processedValue]
                    });
                    if ((fallbackResult === null || fallbackResult === void 0 ? void 0 : fallbackResult.success) !== false) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
                    }
                }
                resolve({
                    success: true,
                    message: `Successfully set ${componentType}.${property}`,
                    data: {
                        nodeUuid,
                        componentType,
                        property,
                        actualValue: verification.actualValue,
                        changeVerified: verification.verified
                    }
                });
            }
            catch (error) {
                console.error(`[ComponentTools] Error setting property:`, error);
                resolve({
                    success: false,
                    error: `Failed to set property: ${error.message}`
                });
            }
        });
    }
    async attachScript(nodeUuid, scriptPath) {
        return new Promise(async (resolve) => {
            var _a, _b, _c;
            // 从脚本路径提取组件类名
            const scriptName = (_a = scriptPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.ts', '').replace('.js', '');
            if (!scriptName) {
                resolve({ success: false, error: 'Invalid script path' });
                return;
            }
            try {
                const scriptAsset = await Editor.Message.request('asset-db', 'query-asset-info', scriptPath);
                if (!(scriptAsset === null || scriptAsset === void 0 ? void 0 : scriptAsset.uuid)) {
                    resolve({ success: false, error: `Script asset not found: ${scriptPath}` });
                    return;
                }
                const scriptClassId = this.uuidToCompressedId(scriptAsset.uuid);
                const matchesScript = (comp) => comp.type === scriptName || comp.type === scriptClassId;
                // create-component 使用 @ccclass 注册名；query-node 对自定义组件返回压缩后的 classId。
                const allComponentsInfo = await this.getComponents(nodeUuid);
                if (allComponentsInfo.success && ((_b = allComponentsInfo.data) === null || _b === void 0 ? void 0 : _b.components)) {
                    const existingScript = allComponentsInfo.data.components.find(matchesScript);
                    if (existingScript) {
                        resolve({
                            success: true,
                            message: `Script '${scriptName}' already exists on node`,
                            data: {
                                nodeUuid,
                                componentName: scriptName,
                                componentType: existingScript.type,
                                existing: true
                            }
                        });
                        return;
                    }
                }
                await Editor.Message.request('scene', 'create-component', {
                    uuid: nodeUuid,
                    component: scriptName
                });
                await new Promise(resolve => setTimeout(resolve, 100));
                const allComponentsInfo2 = await this.getComponents(nodeUuid);
                if (allComponentsInfo2.success && ((_c = allComponentsInfo2.data) === null || _c === void 0 ? void 0 : _c.components)) {
                    const addedScript = allComponentsInfo2.data.components.find(matchesScript);
                    if (addedScript) {
                        resolve({
                            success: true,
                            message: `Script '${scriptName}' attached successfully`,
                            data: {
                                nodeUuid,
                                componentName: scriptName,
                                componentType: addedScript.type,
                                existing: false
                            }
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            error: `Script '${scriptName}' was not found on node after addition. Expected cid: ${scriptClassId}. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                        });
                    }
                }
                else {
                    resolve({
                        success: false,
                        error: `Failed to verify script addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: `Failed to attach script: ${err.message}` });
            }
        });
    }
    uuidToCompressedId(uuid) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const hex = uuid.replace(/-/g, '');
        if (hex.length !== 32)
            return uuid;
        let result = hex.slice(0, 5);
        for (let index = 5; index < hex.length; index += 3) {
            const value = Number.parseInt(hex.slice(index, index + 3), 16);
            result += alphabet[value >> 6] + alphabet[value & 63];
        }
        return result;
    }
    async getAvailableComponents(category = 'all') {
        const componentCategories = {
            renderer: ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.Mask', 'cc.Graphics'],
            ui: ['cc.Button', 'cc.Toggle', 'cc.Slider', 'cc.ScrollView', 'cc.EditBox', 'cc.ProgressBar'],
            physics: ['cc.RigidBody2D', 'cc.BoxCollider2D', 'cc.CircleCollider2D', 'cc.PolygonCollider2D'],
            animation: ['cc.Animation', 'cc.AnimationClip', 'cc.SkeletalAnimation'],
            audio: ['cc.AudioSource'],
            layout: ['cc.Layout', 'cc.Widget', 'cc.PageView', 'cc.PageViewIndicator'],
            effects: ['cc.MotionStreak', 'cc.ParticleSystem2D'],
            camera: ['cc.Camera'],
            light: ['cc.Light', 'cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight']
        };
        let components = [];
        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        }
        else if (componentCategories[category]) {
            components = componentCategories[category];
        }
        return {
            success: true,
            data: {
                category: category,
                components: components
            }
        };
    }
    isValidPropertyDescriptor(propData) {
        // 检查是否是有效的属性描述对象
        if (typeof propData !== 'object' || propData === null) {
            return false;
        }
        try {
            const keys = Object.keys(propData);
            // 避免遍历简单的数值对象（如 {width: 200, height: 150}）
            const isSimpleValueObject = keys.every(key => {
                const value = propData[key];
                return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
            });
            if (isSimpleValueObject) {
                return false;
            }
            // 检查是否包含属性描述符的特征字段，不使用'in'操作符
            const hasName = keys.includes('name');
            const hasValue = keys.includes('value');
            const hasType = keys.includes('type');
            const hasDisplayName = keys.includes('displayName');
            const hasReadonly = keys.includes('readonly');
            // 必须包含name或value字段，且通常还有type字段
            const hasValidStructure = (hasName || hasValue) && (hasType || hasDisplayName || hasReadonly);
            // 额外检查：如果有default字段且结构复杂，避免深度遍历
            if (keys.includes('default') && propData.default && typeof propData.default === 'object') {
                const defaultKeys = Object.keys(propData.default);
                if (defaultKeys.includes('value') && typeof propData.default.value === 'object') {
                    // 这种情况下，我们只返回顶层属性，不深入遍历default.value
                    return hasValidStructure;
                }
            }
            return hasValidStructure;
        }
        catch (error) {
            console.warn(`[isValidPropertyDescriptor] Error checking property descriptor:`, error);
            return false;
        }
    }
    analyzeProperty(component, propertyName) {
        // 从复杂的组件结构中提取可用属性
        const availableProperties = [];
        let propertyValue = undefined;
        let propertyExists = false;
        // 尝试多种方式查找属性：
        // 1. 直接属性访问
        if (Object.prototype.hasOwnProperty.call(component, propertyName)) {
            propertyValue = component[propertyName];
            propertyExists = true;
        }
        // 2. 从嵌套结构中查找 (如从测试数据看到的复杂结构)
        if (!propertyExists && component.properties && typeof component.properties === 'object') {
            // 首先检查properties.value是否存在（这是我们在getComponents中看到的结构）
            if (component.properties.value && typeof component.properties.value === 'object') {
                const valueObj = component.properties.value;
                for (const [key, propData] of Object.entries(valueObj)) {
                    // 检查propData是否是一个有效的属性描述对象
                    // 确保propData是对象且包含预期的属性结构
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
            else {
                // 备用方案：直接从properties查找
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // 优先使用value属性，如果没有则使用propData本身
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // 如果检查失败，直接使用propInfo
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
        }
        // 3. 从直接属性中提取简单属性名
        if (availableProperties.length === 0) {
            for (const key of Object.keys(component)) {
                if (!key.startsWith('_') && !['__type__', 'cid', 'node', 'uuid', 'name', 'enabled', 'type', 'readonly', 'visible'].includes(key)) {
                    availableProperties.push(key);
                }
            }
        }
        if (!propertyExists) {
            return {
                exists: false,
                type: 'unknown',
                availableProperties,
                originalValue: undefined
            };
        }
        let type = 'unknown';
        // 智能类型检测
        if (Array.isArray(propertyValue)) {
            // 数组类型检测
            if (propertyName.toLowerCase().includes('node')) {
                type = 'nodeArray';
            }
            else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            }
            else {
                type = 'array';
            }
        }
        else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else {
                type = 'string';
            }
        }
        else if (typeof propertyValue === 'number') {
            type = 'number';
        }
        else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        }
        else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                }
                else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                }
                else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                }
                else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // 检查是否是节点引用（通过属性名或__id__属性判断）
                    if (propertyName.toLowerCase().includes('node') ||
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    }
                    else {
                        type = 'asset';
                    }
                }
                else if (keys.includes('__id__')) {
                    // 节点引用特征
                    type = 'node';
                }
                else {
                    type = 'object';
                }
            }
            catch (error) {
                console.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        }
        else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else if (propertyName.toLowerCase().includes('node') ||
                propertyName.toLowerCase().includes('target')) {
                type = 'node';
            }
            else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            }
            else {
                type = 'unknown';
            }
        }
        return {
            exists: true,
            type,
            availableProperties,
            originalValue: propertyValue
        };
    }
    smartConvertValue(inputValue, propertyInfo) {
        const { type, originalValue } = propertyInfo;
        console.log(`[smartConvertValue] Converting ${JSON.stringify(inputValue)} to type: ${type}`);
        switch (type) {
            case 'string':
                return String(inputValue);
            case 'number':
                return Number(inputValue);
            case 'boolean':
                if (typeof inputValue === 'boolean')
                    return inputValue;
                if (typeof inputValue === 'string') {
                    return inputValue.toLowerCase() === 'true' || inputValue === '1';
                }
                return Boolean(inputValue);
            case 'color':
                // 优化的颜色处理，支持多种输入格式
                if (typeof inputValue === 'string') {
                    // 字符串格式：十六进制、颜色名称、rgb()/rgba()
                    return this.parseColorString(inputValue);
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    try {
                        const inputKeys = Object.keys(inputValue);
                        // 如果输入是颜色对象，验证并转换
                        if (inputKeys.includes('r') || inputKeys.includes('g') || inputKeys.includes('b')) {
                            return {
                                r: Math.min(255, Math.max(0, Number(inputValue.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(inputValue.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(inputValue.b) || 0)),
                                a: inputValue.a !== undefined ? Math.min(255, Math.max(0, Number(inputValue.a))) : 255
                            };
                        }
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Invalid color object: ${JSON.stringify(inputValue)}`);
                    }
                }
                // 如果有原值，保持原值结构并更新提供的值
                if (originalValue && typeof originalValue === 'object') {
                    try {
                        const inputKeys = typeof inputValue === 'object' && inputValue ? Object.keys(inputValue) : [];
                        return {
                            r: inputKeys.includes('r') ? Math.min(255, Math.max(0, Number(inputValue.r))) : (originalValue.r || 255),
                            g: inputKeys.includes('g') ? Math.min(255, Math.max(0, Number(inputValue.g))) : (originalValue.g || 255),
                            b: inputKeys.includes('b') ? Math.min(255, Math.max(0, Number(inputValue.b))) : (originalValue.b || 255),
                            a: inputKeys.includes('a') ? Math.min(255, Math.max(0, Number(inputValue.a))) : (originalValue.a || 255)
                        };
                    }
                    catch (error) {
                        console.warn(`[smartConvertValue] Error processing color with original value: ${error}`);
                    }
                }
                // 默认返回白色
                console.warn(`[smartConvertValue] Using default white color for invalid input: ${JSON.stringify(inputValue)}`);
                return { r: 255, g: 255, b: 255, a: 255 };
            case 'vec2':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0
                    };
                }
                return originalValue;
            case 'vec3':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        x: Number(inputValue.x) || originalValue.x || 0,
                        y: Number(inputValue.y) || originalValue.y || 0,
                        z: Number(inputValue.z) || originalValue.z || 0
                    };
                }
                return originalValue;
            case 'size':
                if (typeof inputValue === 'object' && inputValue !== null) {
                    return {
                        width: Number(inputValue.width) || originalValue.width || 100,
                        height: Number(inputValue.height) || originalValue.height || 100
                    };
                }
                return originalValue;
            case 'node':
                if (typeof inputValue === 'string') {
                    // 节点引用需要特殊处理
                    return inputValue;
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    // 如果已经是对象形式，返回UUID或完整对象
                    return inputValue.uuid || inputValue;
                }
                return originalValue;
            case 'asset':
                if (typeof inputValue === 'string') {
                    // 如果输入是字符串路径，转换为asset对象
                    return { uuid: inputValue };
                }
                else if (typeof inputValue === 'object' && inputValue !== null) {
                    return inputValue;
                }
                return originalValue;
            default:
                // 对于未知类型，尽量保持原有结构
                if (typeof inputValue === typeof originalValue) {
                    return inputValue;
                }
                return originalValue;
        }
    }
    parseColorString(colorStr) {
        const str = colorStr.trim();
        // 只支持十六进制格式 #RRGGBB 或 #RRGGBBAA
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            }
            else if (str.length === 9) { // #RRGGBBAA
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                const a = parseInt(str.substring(7, 9), 16);
                return { r, g, b, a };
            }
        }
        // 如果不是有效的十六进制格式，返回错误提示
        throw new Error(`Invalid color format: "${colorStr}". Only hexadecimal format is supported (e.g., "#FF0000" or "#FF0000FF")`);
    }
    async verifyPropertyChange(nodeUuid, componentType, property, originalValue, expectedValue) {
        var _a, _b;
        console.log(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        console.log(`[verifyPropertyChange] Expected value:`, JSON.stringify(expectedValue));
        console.log(`[verifyPropertyChange] Original value:`, JSON.stringify(originalValue));
        try {
            // 重新获取组件信息进行验证
            console.log(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            console.log(`[verifyPropertyChange] getComponentInfo success:`, componentInfo.success);
            const allComponents = await this.getComponents(nodeUuid);
            console.log(`[verifyPropertyChange] getComponents success:`, allComponents.success);
            if (componentInfo.success && componentInfo.data) {
                console.log(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                console.log(`[verifyPropertyChange] Available properties:`, allPropertyNames);
                const propertyData = (_a = componentInfo.data.properties) === null || _a === void 0 ? void 0 : _a[property];
                console.log(`[verifyPropertyChange] Raw property data for '${property}':`, JSON.stringify(propertyData));
                // 从属性数据中提取实际值
                let actualValue = propertyData;
                console.log(`[verifyPropertyChange] Initial actualValue:`, JSON.stringify(actualValue));
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    console.log(`[verifyPropertyChange] Extracted actualValue from .value:`, JSON.stringify(actualValue));
                }
                else {
                    console.log(`[verifyPropertyChange] No .value property found, using raw data`);
                }
                // 修复验证逻辑：检查实际值是否匹配期望值
                let verified = false;
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // 对于引用类型（节点/组件/资源），比较UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                    console.log(`[verifyPropertyChange] Reference comparison:`);
                    console.log(`  - Expected UUID: "${expectedUuid}"`);
                    console.log(`  - Actual UUID: "${actualUuid}"`);
                    console.log(`  - UUID match: ${actualUuid === expectedUuid}`);
                    console.log(`  - UUID not empty: ${expectedUuid !== ''}`);
                    console.log(`  - Final verified: ${verified}`);
                }
                else {
                    // 对于其他类型，直接比较值
                    console.log(`[verifyPropertyChange] Value comparison:`);
                    console.log(`  - Expected type: ${typeof expectedValue}`);
                    console.log(`  - Actual type: ${typeof actualValue}`);
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // 对象类型的深度比较
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            console.log(`  - Object comparison (JSON): ${verified}`);
                        }
                        else {
                            // 基本类型的直接比较
                            verified = actualValue === expectedValue;
                            console.log(`  - Direct comparison: ${verified}`);
                        }
                    }
                    else {
                        // 类型不匹配时的特殊处理（如数字和字符串）
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        console.log(`  - String match: ${stringMatch}`);
                        console.log(`  - Number match: ${numberMatch}`);
                        console.log(`  - Type mismatch verified: ${verified}`);
                    }
                }
                console.log(`[verifyPropertyChange] Final verification result: ${verified}`);
                console.log(`[verifyPropertyChange] Final actualValue:`, JSON.stringify(actualValue));
                const result = {
                    verified,
                    actualValue,
                    fullData: {
                        // 只返回修改的属性信息，不返回完整组件数据
                        modifiedProperty: {
                            name: property,
                            before: originalValue,
                            expected: expectedValue,
                            actual: actualValue,
                            verified,
                            propertyMetadata: propertyData // 只包含这个属性的元数据
                        },
                        // 简化的组件信息
                        componentSummary: {
                            nodeUuid,
                            componentType,
                            totalProperties: Object.keys(((_b = componentInfo.data) === null || _b === void 0 ? void 0 : _b.properties) || {}).length
                        }
                    }
                };
                console.log(`[verifyPropertyChange] Returning result:`, JSON.stringify(result, null, 2));
                return result;
            }
            else {
                console.log(`[verifyPropertyChange] ComponentInfo failed or no data:`, componentInfo);
            }
        }
        catch (error) {
            console.error('[verifyPropertyChange] Verification failed with error:', error);
            console.error('[verifyPropertyChange] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
        console.log(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }
    /**
     * 检测是否为节点属性，如果是则重定向到对应的节点方法
     */
    async checkAndRedirectNodeProperties(args) {
        const { nodeUuid, componentType, property, propertyType, value } = args;
        // 检测是否为节点基础属性（应该使用 set_node_property）
        const nodeBasicProperties = [
            'name', 'active', 'layer', 'mobility', 'parent', 'children', 'hideFlags'
        ];
        // 检测是否为节点变换属性（应该使用 set_node_transform）
        const nodeTransformProperties = [
            'position', 'rotation', 'scale', 'eulerAngles', 'angle'
        ];
        // Detect attempts to set cc.Node properties (common mistake)
        if (componentType === 'cc.Node' || componentType === 'Node') {
            if (nodeBasicProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node basic property, not a component property`,
                    instruction: `Please use set_node_property method to set node properties: set_node_property(uuid="${nodeUuid}", property="${property}", value=${JSON.stringify(value)})`
                };
            }
            else if (nodeTransformProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node transform property, not a component property`,
                    instruction: `Please use set_node_transform method to set transform properties: set_node_transform(uuid="${nodeUuid}", ${property}=${JSON.stringify(value)})`
                };
            }
        }
        // Detect common incorrect usage
        if (nodeBasicProperties.includes(property) || nodeTransformProperties.includes(property)) {
            const methodName = nodeTransformProperties.includes(property) ? 'set_node_transform' : 'set_node_property';
            return {
                success: false,
                error: `Property '${property}' is a node property, not a component property`,
                instruction: `Property '${property}' should be set using ${methodName} method, not set_component_property. Please use: ${methodName}(uuid="${nodeUuid}", ${nodeTransformProperties.includes(property) ? property : `property="${property}"`}=${JSON.stringify(value)})`
            };
        }
        return null; // 不是节点属性，继续正常处理
    }
    /**
     * 生成组件建议信息
     */
    generateComponentSuggestion(requestedType, availableTypes, property) {
        // 检查是否存在相似的组件类型
        const similarTypes = availableTypes.filter(type => type.toLowerCase().includes(requestedType.toLowerCase()) ||
            requestedType.toLowerCase().includes(type.toLowerCase()));
        let instruction = '';
        if (similarTypes.length > 0) {
            instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
            instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
        }
        // Recommend possible components based on property name
        const propertyToComponentMap = {
            'string': ['cc.Label', 'cc.RichText', 'cc.EditBox'],
            'text': ['cc.Label', 'cc.RichText'],
            'fontSize': ['cc.Label', 'cc.RichText'],
            'spriteFrame': ['cc.Sprite'],
            'color': ['cc.Label', 'cc.Sprite', 'cc.Graphics'],
            'normalColor': ['cc.Button'],
            'pressedColor': ['cc.Button'],
            'target': ['cc.Button'],
            'contentSize': ['cc.UITransform'],
            'anchorPoint': ['cc.UITransform']
        };
        const recommendedComponents = propertyToComponentMap[property] || [];
        const availableRecommended = recommendedComponents.filter(comp => availableTypes.includes(comp));
        if (availableRecommended.length > 0) {
            instruction += `\n\n🎯 Based on property '${property}', recommended components: ${availableRecommended.join(', ')}`;
        }
        // Provide operation suggestions
        instruction += `\n\n📋 Suggested Actions:`;
        instruction += `\n1. Use get_components(nodeUuid="${requestedType.includes('uuid') ? 'YOUR_NODE_UUID' : 'nodeUuid'}") to view all components on the node`;
        instruction += `\n2. If you need to add a component, use add_component(nodeUuid="...", componentType="${requestedType}")`;
        instruction += `\n3. Verify that the component type name is correct (case-sensitive)`;
        return instruction;
    }
    /**
     * 快速验证资源设置结果
     */
    async quickVerifyAsset(nodeUuid, componentType, property) {
        try {
            const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!rawNodeData || !rawNodeData.__comps__) {
                return null;
            }
            // 找到组件
            const component = rawNodeData.__comps__.find((comp) => {
                const compType = comp.__type__ || comp.cid || comp.type;
                return compType === componentType;
            });
            if (!component) {
                return null;
            }
            // 提取属性值
            const properties = this.extractComponentProperties(component);
            const propertyData = properties[property];
            if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                return propertyData.value;
            }
            else {
                return propertyData;
            }
        }
        catch (error) {
            console.error(`[quickVerifyAsset] Error:`, error);
            return null;
        }
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLHVJQUF1STtnQkFDcEosV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGtLQUFrSzt5QkFDbEw7d0JBQ0QsYUFBYSxFQUFFOzRCQUNYLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1REFBdUQ7eUJBQ3ZFO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUM7aUJBQzFDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsNE1BQTRNO2dCQUN6TixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsV0FBVzt5QkFDM0I7d0JBQ0QsYUFBYSxFQUFFOzRCQUNYLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx3SUFBd0k7eUJBQ3hKO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUM7aUJBQzFDO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixXQUFXLEVBQUUsOEJBQThCO2dCQUMzQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRTs0QkFDTixJQUFJLEVB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QUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUMvQixDQUFDO2lCQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVk7Z0JBQ3ZDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDTCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFFBQVEsMEVB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VG9vbEV4ZWN1dG9yLCBDb21wb25lbnRJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhZGRfY29tcG9uZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkZCBhIGNvbXBvbmVudCB0byBhIHNwZWNpZmljIG5vZGUuIElNUE9SVEFOVDogWW91IG11c3QgcHJvdmlkZSB0aGUgbm9kZVV1aWQgcGFyYW1ldGVyIHRvIHNwZWNpZnkgd2hpY2ggbm9kZSB0byBhZGQgdGhlIGNvbXBvbmVudCB0by4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRC4gUkVRVUlSRUQ6IFlvdSBtdXN0IHNwZWNpZnkgdGhlIGV4YWN0IG5vZGUgdG8gYWRkIHRoZSBjb21wb25lbnQgdG8uIFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIGdldCB0aGUgVVVJRCBvZiB0aGUgZGVzaXJlZCBub2RlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAoZS5nLiwgY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuQnV0dG9uKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVtb3ZlX2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZW1vdmUgYSBjb21wb25lbnQgZnJvbSBhIG5vZGUuIGNvbXBvbmVudFR5cGUgbXVzdCBiZSB0aGUgY29tcG9uZW50XFwncyBjbGFzc0lkIChjaWQsIGkuZS4gdGhlIHR5cGUgZmllbGQgZnJvbSBnZXRDb21wb25lbnRzKSwgbm90IHRoZSBzY3JpcHQgbmFtZSBvciBjbGFzcyBuYW1lLiBVc2UgZ2V0Q29tcG9uZW50cyB0byBnZXQgdGhlIGNvcnJlY3QgY2lkLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IGNpZCAodHlwZSBmaWVsZCBmcm9tIGdldENvbXBvbmVudHMpLiBEbyBOT1QgdXNlIHNjcmlwdCBuYW1lIG9yIGNsYXNzIG5hbWUuIEV4YW1wbGU6IFwiY2MuU3ByaXRlXCIgb3IgXCI5YjRhN3VlVDl4RDZhUkUrQWxPdXN5MVwiJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgYWxsIGNvbXBvbmVudHMgb2YgYSBub2RlJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9jb21wb25lbnRfaW5mbycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgc3BlY2lmaWMgY29tcG9uZW50IGluZm9ybWF0aW9uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSB0byBnZXQgaW5mbyBmb3InXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NldF9jb21wb25lbnRfcHJvcGVydHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IGNvbXBvbmVudCBwcm9wZXJ0eSB2YWx1ZXMgZm9yIFVJIGNvbXBvbmVudHMgb3IgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzLiBTdXBwb3J0cyBzZXR0aW5nIHByb3BlcnRpZXMgb2YgYnVpbHQtaW4gVUkgY29tcG9uZW50cyAoZS5nLiwgY2MuTGFiZWwsIGNjLlNwcml0ZSkgYW5kIGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cy4gTm90ZTogRm9yIG5vZGUgYmFzaWMgcHJvcGVydGllcyAobmFtZSwgYWN0aXZlLCBsYXllciwgZXRjLiksIHVzZSBzZXRfbm9kZV9wcm9wZXJ0eS4gRm9yIG5vZGUgdHJhbnNmb3JtIHByb3BlcnRpZXMgKHBvc2l0aW9uLCByb3RhdGlvbiwgc2NhbGUsIGV0Yy4pLCB1c2Ugc2V0X25vZGVfdHJhbnNmb3JtLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgbm9kZSBVVUlEIC0gTXVzdCBzcGVjaWZ5IHRoZSBub2RlIHRvIG9wZXJhdGUgb24nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgLSBDYW4gYmUgYnVpbHQtaW4gY29tcG9uZW50cyAoZS5nLiwgY2MuTGFiZWwpIG9yIGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cyAoZS5nLiwgTXlTY3JpcHQpLiBJZiB1bnN1cmUgYWJvdXQgY29tcG9uZW50IHR5cGUsIHVzZSBnZXRfY29tcG9uZW50cyBmaXJzdCB0byByZXRyaWV2ZSBhbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpGVudW3pmZDliLbvvIzlhYHorrjku7vmhI/nu4Tku7bnsbvlnovljIXmi6zoh6rlrprkuYnohJrmnKxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgbmFtZSAtIFRoZSBwcm9wZXJ0eSB0byBzZXQuIENvbW1vbiBwcm9wZXJ0aWVzIGluY2x1ZGU6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgY2MuTGFiZWw6IHN0cmluZyAodGV4dCBjb250ZW50KSwgZm9udFNpemUgKGZvbnQgc2l6ZSksIGNvbG9yICh0ZXh0IGNvbG9yKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLlNwcml0ZTogc3ByaXRlRnJhbWUgKHNwcml0ZSBmcmFtZSksIGNvbG9yICh0aW50IGNvbG9yKSwgc2l6ZU1vZGUgKHNpemUgbW9kZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjYy5CdXR0b246IG5vcm1hbENvbG9yIChub3JtYWwgY29sb3IpLCBwcmVzc2VkQ29sb3IgKHByZXNzZWQgY29sb3IpLCB0YXJnZXQgKHRhcmdldCBub2RlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIGNjLlVJVHJhbnNmb3JtOiBjb250ZW50U2l6ZSAoY29udGVudCBzaXplKSwgYW5jaG9yUG9pbnQgKGFuY2hvciBwb2ludClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBDdXN0b20gU2NyaXB0czogQmFzZWQgb24gcHJvcGVydGllcyBkZWZpbmVkIGluIHRoZSBzY3JpcHQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSB0eXBlIC0gTXVzdCBleHBsaWNpdGx5IHNwZWNpZnkgdGhlIHByb3BlcnR5IGRhdGEgdHlwZSBmb3IgY29ycmVjdCB2YWx1ZSBjb252ZXJzaW9uIGFuZCB2YWxpZGF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdmbG9hdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb2xvcicsICd2ZWMyJywgJ3ZlYzMnLCAnc2l6ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlJywgJ2NvbXBvbmVudCcsICdzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IHZhbHVlIC0gVXNlIHRoZSBjb3JyZXNwb25kaW5nIGRhdGEgZm9ybWF0IGJhc2VkIG9uIHByb3BlcnR5VHlwZTpcXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/Cfk50gQmFzaWMgRGF0YSBUeXBlczpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBzdHJpbmc6IFwiSGVsbG8gV29ybGRcIiAodGV4dCBzdHJpbmcpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgbnVtYmVyL2ludGVnZXIvZmxvYXQ6IDQyIG9yIDMuMTQgKG51bWVyaWMgdmFsdWUpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgYm9vbGVhbjogdHJ1ZSBvciBmYWxzZSAoYm9vbGVhbiB2YWx1ZSlcXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/CfjqggQ29sb3IgVHlwZTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjb2xvcjoge1wiclwiOjI1NSxcImdcIjowLFwiYlwiOjAsXCJhXCI6MjU1fSAoUkdCQSB2YWx1ZXMsIHJhbmdlIDAtMjU1KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAtIEFsdGVybmF0aXZlOiBcIiNGRjAwMDBcIiAoaGV4YWRlY2ltYWwgZm9ybWF0KVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAtIFRyYW5zcGFyZW5jeTogYSB2YWx1ZSBjb250cm9scyBvcGFjaXR5LCAyNTUgPSBmdWxseSBvcGFxdWUsIDAgPSBmdWxseSB0cmFuc3BhcmVudFxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+TkCBWZWN0b3IgYW5kIFNpemUgVHlwZXM6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgdmVjMjoge1wieFwiOjEwMCxcInlcIjo1MH0gKDJEIHZlY3RvcilcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiB2ZWMzOiB7XCJ4XCI6MSxcInlcIjoyLFwielwiOjN9ICgzRCB2ZWN0b3IpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgc2l6ZToge1wid2lkdGhcIjoxMDAsXCJoZWlnaHRcIjo1MH0gKHNpemUgZGltZW5zaW9ucylcXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ/CflJcgUmVmZXJlbmNlIFR5cGVzICh1c2luZyBVVUlEIHN0cmluZ3MpOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn4oCiIG5vZGU6IFwidGFyZ2V0LW5vZGUtdXVpZFwiIChub2RlIHJlZmVyZW5jZSlcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IHRvIGdldDogVXNlIGdldF9hbGxfbm9kZXMgb3IgZmluZF9ub2RlX2J5X25hbWUgdG8gZ2V0IG5vZGUgVVVJRHNcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjb21wb25lbnQ6IFwidGFyZ2V0LW5vZGUtdXVpZFwiIChjb21wb25lbnQgcmVmZXJlbmNlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgaXQgd29ya3M6IFxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAgIDEuIFByb3ZpZGUgdGhlIFVVSUQgb2YgdGhlIE5PREUgdGhhdCBjb250YWlucyB0aGUgdGFyZ2V0IGNvbXBvbmVudFxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAgIDIuIFN5c3RlbSBhdXRvLWRldGVjdHMgcmVxdWlyZWQgY29tcG9uZW50IHR5cGUgZnJvbSBwcm9wZXJ0eSBtZXRhZGF0YVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAgIDMuIEZpbmRzIHRoZSBjb21wb25lbnQgb24gdGFyZ2V0IG5vZGUgYW5kIGdldHMgaXRzIHNjZW5lIF9faWRfX1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICAgIDQuIFNldHMgcmVmZXJlbmNlIHVzaW5nIHRoZSBzY2VuZSBfX2lkX18gKG5vdCBub2RlIFVVSUQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEV4YW1wbGU6IHZhbHVlPVwibGFiZWwtbm9kZS11dWlkXCIgd2lsbCBmaW5kIGNjLkxhYmVsIGFuZCB1c2UgaXRzIHNjZW5lIElEXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgc3ByaXRlRnJhbWU6IFwic3ByaXRlZnJhbWUtdXVpZFwiIChzcHJpdGUgZnJhbWUgYXNzZXQpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgIEhvdyB0byBnZXQ6IENoZWNrIGFzc2V0IGRhdGFiYXNlIG9yIHVzZSBhc3NldCBicm93c2VyXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgcHJlZmFiOiBcInByZWZhYi11dWlkXCIgKHByZWZhYiBhc3NldClcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyAgSG93IHRvIGdldDogQ2hlY2sgYXNzZXQgZGF0YWJhc2Ugb3IgdXNlIGFzc2V0IGJyb3dzZXJcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBhc3NldDogXCJhc3NldC11dWlkXCIgKGdlbmVyaWMgYXNzZXQgcmVmZXJlbmNlKVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnICBIb3cgdG8gZ2V0OiBDaGVjayBhc3NldCBkYXRhYmFzZSBvciB1c2UgYXNzZXQgYnJvd3NlclxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn8J+TiyBBcnJheSBUeXBlczpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBub2RlQXJyYXk6IFtcInV1aWQxXCIsXCJ1dWlkMlwiXSAoYXJyYXkgb2Ygbm9kZSBVVUlEcylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBjb2xvckFycmF5OiBbe1wiclwiOjI1NSxcImdcIjowLFwiYlwiOjAsXCJhXCI6MjU1fV0gKGFycmF5IG9mIGNvbG9ycylcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+KAoiBudW1iZXJBcnJheTogWzEsMiwzLDQsNV0gKGFycmF5IG9mIG51bWJlcnMpXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfigKIgc3RyaW5nQXJyYXk6IFtcIml0ZW0xXCIsXCJpdGVtMlwiXSAoYXJyYXkgb2Ygc3RyaW5ncyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnLCAncHJvcGVydHknLCAncHJvcGVydHlUeXBlJywgJ3ZhbHVlJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhdHRhY2hfc2NyaXB0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0F0dGFjaCBhIHNjcmlwdCBjb21wb25lbnQgdG8gYSBub2RlJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHRQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTY3JpcHQgYXNzZXQgcGF0aCAoZS5nLiwgZGI6Ly9hc3NldHMvc2NyaXB0cy9NeVNjcmlwdC50cyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ3NjcmlwdFBhdGgnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF9hdmFpbGFibGVfY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgbGlzdCBvZiBhdmFpbGFibGUgY29tcG9uZW50IHR5cGVzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCBjYXRlZ29yeSBmaWx0ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3JlbmRlcmVyJywgJ3VpJywgJ3BoeXNpY3MnLCAnYW5pbWF0aW9uJywgJ2F1ZGlvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FkZF9jb21wb25lbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgY2FzZSAncmVtb3ZlX2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdnZXRfY29tcG9uZW50cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb21wb25lbnRfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0Q29tcG9uZW50UHJvcGVydHkoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdhdHRhY2hfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5hdHRhY2hTY3JpcHQoYXJncy5ub2RlVXVpZCwgYXJncy5zY3JpcHRQYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9hdmFpbGFibGVfY29tcG9uZW50cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXZhaWxhYmxlQ29tcG9uZW50cyhhcmdzLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIOWFiOafpeaJvuiKgueCueS4iuaYr+WQpuW3suWtmOWcqOivpee7hOS7tlxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nQ29tcG9uZW50ID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VmVyaWZpZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyDlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmt7vliqDnu4Tku7ZcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXG4gICAgICAgICAgICB9KS50aGVuKGFzeW5jIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOetieW+heS4gOauteaXtumXtOiuqUVkaXRvcuWujOaIkOe7hOS7tua3u+WKoFxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgICAgICAvLyDph43mlrDmn6Xor6LoioLngrnkv6Hmga/pqozor4Hnu4Tku7bmmK/lkKbnnJ/nmoTmt7vliqDmiJDlip9cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbzIgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8yLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8yLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkQ29tcG9uZW50ID0gYWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWRkZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFZlcmlmaWVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgd2FzIG5vdCBmb3VuZCBvbiBub2RlIGFmdGVyIGFkZGl0aW9uLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthbGxDb21wb25lbnRzSW5mbzIuZGF0YS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IGNvbXBvbmVudCBhZGRpdGlvbjogJHthbGxDb21wb25lbnRzSW5mbzIuZXJyb3IgfHwgJ1VuYWJsZSB0byBnZXQgbm9kZSBjb21wb25lbnRzJ31gXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHZlcmlmeUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBjb21wb25lbnQgYWRkaXRpb246ICR7dmVyaWZ5RXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZGRDb21wb25lbnRUb05vZGUnLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyMjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIDEuIOafpeaJvuiKgueCueS4iueahOaJgOaciee7hOS7tlxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFhbGxDb21wb25lbnRzSW5mby5zdWNjZXNzIHx8ICFhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2FsbENvbXBvbmVudHNJbmZvLmVycm9yfWAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMi4g5Y+q5p+l5om+dHlwZeWtl+auteetieS6jmNvbXBvbmVudFR5cGXnmoTnu4Tku7bvvIjljbNjaWTvvIlcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAnJHtub2RlVXVpZH0nLiDor7fnlKhnZXRDb21wb25lbnRz6I635Y+WdHlwZeWtl+aute+8iGNpZO+8ieS9nOS4umNvbXBvbmVudFR5cGXjgIJgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY29tcG9uZW50LnV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgb24gbm9kZSAnJHtub2RlVXVpZH0nIGhhcyBubyBpbnN0YW5jZSBVVUlELmAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gMy4g5a6Y5pa5QVBJ55u05o6l56e76ZmkXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGNvbXBvbmVudC51dWlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gNC4g5YaN5p+l5LiA5qyh56Gu6K6k5piv5ZCm56e76ZmkXG4gICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGlsbEV4aXN0cyA9IGFmdGVyUmVtb3ZlSW5mby5zdWNjZXNzICYmIGFmdGVyUmVtb3ZlSW5mby5kYXRhPy5jb21wb25lbnRzPy5zb21lKChjb21wOiBhbnkpID0+IGNvbXAudHlwZSA9PT0gY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0aWxsRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IHJlbW92ZWQgZnJvbSBub2RlICcke25vZGVVdWlkfScuYCB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgcmVtb3ZlZCBzdWNjZXNzZnVsbHkgZnJvbSBub2RlICcke25vZGVVdWlkfSdgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byByZW1vdmUgY29tcG9uZW50OiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyDkvJjlhYjlsJ3or5Xnm7TmjqXkvb/nlKggRWRpdG9yIEFQSSDmn6Xor6LoioLngrnkv6Hmga9cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCkudGhlbigobm9kZURhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YSAmJiBub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHRoaXMucmVhZER1bXBWYWx1ZShjb21wLnZhbHVlPy51dWlkID8/IGNvbXAudXVpZCkgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRoaXMucmVhZER1bXBWYWx1ZShjb21wLnZhbHVlPy5lbmFibGVkID8/IGNvbXAuZW5hYmxlZCkgPz8gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcClcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCBvciBubyBjb21wb25lbnRzIGRhdGEnIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aSH55So5pa55qGI77ya5L2/55So5Zy65pmv6ISa5pysXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucykudGhlbigocmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycjI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g5LyY5YWI5bCd6K+V55u05o6l5L2/55SoIEVkaXRvciBBUEkg5p+l6K+i6IqC54K55L+h5oGvXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpLnRoZW4oKG5vZGVEYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZURhdGEgJiYgbm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGVEYXRhLl9fY29tcHNfXy5maW5kKChjb21wOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcFR5cGUgPT09IGNvbXBvbmVudFR5cGU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcG9uZW50LmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXBvbmVudC5lbmFibGVkIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogdGhpcy5leHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wb25lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZWAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muS9v+eUqOWcuuaZr+iEmuacrFxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWRdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuZGF0YS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSByZXN1bHQuZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmNvbXBvbmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlYCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIGdldCBjb21wb25lbnQgaW5mbycgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyMjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudDogYW55KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIFByb2Nlc3NpbmcgY29tcG9uZW50OmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpO1xuICAgICAgICBcbiAgICAgICAgLy8g5qOA5p+l57uE5Lu25piv5ZCm5pyJIHZhbHVlIOWxnuaAp++8jOi/memAmuW4uOWMheWQq+WunumZheeahOe7hOS7tuWxnuaAp1xuICAgICAgICBpZiAoY29tcG9uZW50LnZhbHVlICYmIHR5cGVvZiBjb21wb25lbnQudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGb3VuZCBjb21wb25lbnQudmFsdWUgd2l0aCBwcm9wZXJ0aWVzOmAsIE9iamVjdC5rZXlzKGNvbXBvbmVudC52YWx1ZSkpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC52YWx1ZTsgLy8g55u05o6l6L+U5ZueIHZhbHVlIOWvueixoe+8jOWug+WMheWQq+aJgOaciee7hOS7tuWxnuaAp1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDlpIfnlKjmlrnmoYjvvJrku47nu4Tku7blr7nosaHkuK3nm7TmjqXmj5Dlj5blsZ7mgKdcbiAgICAgICAgY29uc3QgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICBjb25zdCBleGNsdWRlS2V5cyA9IFsnX190eXBlX18nLCAnZW5hYmxlZCcsICdub2RlJywgJ19pZCcsICdfX3NjcmlwdEFzc2V0JywgJ3V1aWQnLCAnbmFtZScsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnX2VuYWJsZWQnLCAndHlwZScsICdyZWFkb25seScsICd2aXNpYmxlJywgJ2NpZCcsICdlZGl0b3InLCAnZXh0ZW5kcyddO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gY29tcG9uZW50KSB7XG4gICAgICAgICAgICBpZiAoIWV4Y2x1ZGVLZXlzLmluY2x1ZGVzKGtleSkgJiYgIWtleS5zdGFydHNXaXRoKCdfJykpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGb3VuZCBkaXJlY3QgcHJvcGVydHkgJyR7a2V5fSc6YCwgdHlwZW9mIGNvbXBvbmVudFtrZXldKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzW2tleV0gPSBjb21wb25lbnRba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gRmluYWwgZXh0cmFjdGVkIHByb3BlcnRpZXM6YCwgT2JqZWN0LmtleXMocHJvcGVydGllcykpO1xuICAgICAgICByZXR1cm4gcHJvcGVydGllcztcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlYWREdW1wVmFsdWUodmFsdWU6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZChjb21wb25lbnRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAgICAgY29uc29sZS5sb2coYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gU2VhcmNoaW5nIGZvciBjb21wb25lbnQgdHlwZSB3aXRoIFVVSUQ6ICR7Y29tcG9uZW50VXVpZH1gKTtcbiAgICAgICAgaWYgKCFjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZVRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGlmICghbm9kZVRyZWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRmFpbGVkIHRvIHF1ZXJ5IG5vZGUgdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZUluZm8gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudE5vZGVJbmZvIHx8ICFjdXJyZW50Tm9kZUluZm8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsTm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgY3VycmVudE5vZGVJbmZvLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbE5vZGVEYXRhICYmIGZ1bGxOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEFueSA9IGNvbXAgYXMgYW55OyAvLyBDYXN0IHRvIGFueSB0byBhY2Nlc3MgZHluYW1pYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvbXBvbmVudCBVVUlEIGlzIG5lc3RlZCBpbiB0aGUgJ3ZhbHVlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wQW55Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGb3VuZCBjb21wb25lbnQgdHlwZSAnJHtjb21wb25lbnRUeXBlfScgZm9yIFVVSUQgJHtjb21wb25lbnRVdWlkfSBvbiBub2RlICR7ZnVsbE5vZGVEYXRhLm5hbWU/LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb3VsZCBub3QgcXVlcnkgbm9kZSAke2N1cnJlbnROb2RlSW5mby51dWlkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvbXBvbmVudCB3aXRoIFVVSUQgJHtjb21wb25lbnRVdWlkfSBub3QgZm91bmQgaW4gc2NlbmUgdHJlZS5gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ICh0eXBlOiAke3Byb3BlcnR5VHlwZX0pID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG9uIG5vZGUgJHtub2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDA6IOajgOa1i+aYr+WQpuS4uuiKgueCueWxnuaAp++8jOWmguaenOaYr+WImemHjeWumuWQkeWIsOWvueW6lOeahOiKgueCueaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVSZWRpcmVjdFJlc3VsdCA9IGF3YWl0IHRoaXMuY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3MpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlUmVkaXJlY3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShub2RlUmVkaXJlY3RSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgMTog6I635Y+W57uE5Lu25L+h5oGv77yM5L2/55So5LiOZ2V0Q29tcG9uZW50c+ebuOWQjOeahOaWueazlVxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnRzUmVzcG9uc2Uuc3VjY2VzcyB8fCAhY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7Y29tcG9uZW50c1Jlc3BvbnNlLmVycm9yfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGNvbXBvbmVudHNSZXNwb25zZS5kYXRhLmNvbXBvbmVudHM7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyOiDmn6Xmib7nm67moIfnu4Tku7ZcbiAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0Q29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsbENvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IGFsbENvbXBvbmVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVR5cGVzLnB1c2goY29tcC50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudCA9IGNvbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dkvpvmm7Tor6bnu4bnmoTplJnor6/kv6Hmga/lkozlu7rorq5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihjb21wb25lbnRUeXBlLCBhdmFpbGFibGVUeXBlcywgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVUeXBlcy5qb2luKCcsICcpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogaW5zdHJ1Y3Rpb25cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCAzOiDoh6rliqjmo4DmtYvlkozovazmjaLlsZ7mgKflgLxcbiAgICAgICAgICAgICAgICBsZXQgcHJvcGVydHlJbmZvO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIEFuYWx5emluZyBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlJbmZvID0gdGhpcy5hbmFseXplUHJvcGVydHkodGFyZ2V0Q29tcG9uZW50LCBwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoYW5hbHl6ZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBpbiBhbmFseXplUHJvcGVydHk6YCwgYW5hbHl6ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGFuYWx5emUgcHJvcGVydHkgJyR7cHJvcGVydHl9JzogJHthbmFseXplRXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghcHJvcGVydHlJbmZvLmV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG5vdCBmb3VuZCBvbiBjb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nLiBBdmFpbGFibGUgcHJvcGVydGllczogJHtwcm9wZXJ0eUluZm8uYXZhaWxhYmxlUHJvcGVydGllcy5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA0OiDlpITnkIblsZ7mgKflgLzlkozorr7nva5cbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFZhbHVlID0gcHJvcGVydHlJbmZvLm9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgbGV0IHByb2Nlc3NlZFZhbHVlOiBhbnk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5qC55o2u5piO56Gu55qEcHJvcGVydHlUeXBl5aSE55CG5bGe5oCn5YC8XG4gICAgICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZmxvYXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBCb29sZWFuKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb2xvcic6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWtl+espuS4suagvOW8j++8muaUr+aMgeWNgeWFrei/m+WItuOAgeminOiJsuWQjeensOOAgXJnYigpL3JnYmEoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdGhpcy5wYXJzZUNvbG9yU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWvueixoeagvOW8j++8mumqjOivgeW5tui9rOaNolJHQkHlgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogdmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3IgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCByLCBnLCBiIHByb3BlcnRpZXMgb3IgYSBoZXhhZGVjaW1hbCBzdHJpbmcgKGUuZy4sIFwiI0ZGMDAwMFwiKScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZlYzInOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcih2YWx1ZS55KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMyIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHZhbHVlLnkpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcih2YWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMzIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSwgeiBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NpemUgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB3aWR0aCwgaGVpZ2h0IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdub2RlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSByZWZlcmVuY2UgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g57uE5Lu25byV55So6ZyA6KaB54m55q6K5aSE55CG77ya6YCa6L+H6IqC54K5VVVJROaJvuWIsOe7hOS7tueahF9faWRfX1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWU7IC8vIOWFiOS/neWtmOiKgueCuVVVSUTvvIzlkI7nu63kvJrovazmjaLkuLpfX2lkX19cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgcmVmZXJlbmNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgKG5vZGUgVVVJRCBjb250YWluaW5nIHRoZSB0YXJnZXQgY29tcG9uZW50KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncHJlZmFiJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXNzZXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Byb3BlcnR5VHlwZX0gdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbm9kZUFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogaXRlbSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGVBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29sb3JBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3JBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gTnVtYmVyKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOdW1iZXJBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gU3RyaW5nKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHJpbmdBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvcGVydHkgdHlwZTogJHtwcm9wZXJ0eVR5cGV9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIENvbnZlcnRpbmcgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSAtPiAke0pTT04uc3RyaW5naWZ5KHByb2Nlc3NlZFZhbHVlKX0gKHR5cGU6ICR7cHJvcGVydHlUeXBlfSlgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBQcm9wZXJ0eSBhbmFseXNpcyByZXN1bHQ6IHByb3BlcnR5SW5mby50eXBlPVwiJHtwcm9wZXJ0eUluZm8udHlwZX1cIiwgcHJvcGVydHlUeXBlPVwiJHtwcm9wZXJ0eVR5cGV9XCJgKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBXaWxsIHVzZSBjb2xvciBzcGVjaWFsIGhhbmRsaW5nOiAke3Byb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnfWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIOeUqOS6jumqjOivgeeahOWunumZheacn+acm+WAvO+8iOWvueS6jue7hOS7tuW8leeUqOmcgOimgeeJueauiuWkhOeQhu+8iVxuICAgICAgICAgICAgICAgIGxldCBhY3R1YWxFeHBlY3RlZFZhbHVlID0gcHJvY2Vzc2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiDojrflj5bljp/lp4voioLngrnmlbDmja7mnaXmnoTlu7rmraPnoa7nmoTot6/lvoRcbiAgICAgICAgICAgICAgICBjb25zdCByYXdOb2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyYXdOb2RlRGF0YSB8fCAhcmF3Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgcmF3IG5vZGUgZGF0YSBmb3IgcHJvcGVydHkgc2V0dGluZ2BcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5om+5Yiw5Y6f5aeL57uE5Lu255qE57Si5byVXG4gICAgICAgICAgICAgICAgbGV0IHJhd0NvbXBvbmVudEluZGV4ID0gLTE7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByYXdOb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IHJhd05vZGVEYXRhLl9fY29tcHNfX1tpXSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGUgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcFR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhd0NvbXBvbmVudEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyYXdDb21wb25lbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ291bGQgbm90IGZpbmQgY29tcG9uZW50IGluZGV4IGZvciBzZXR0aW5nIHByb3BlcnR5YFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByYXdDb21wb25lbnQgPSByYXdOb2RlRGF0YS5fX2NvbXBzX19bcmF3Q29tcG9uZW50SW5kZXhdIGFzIGFueTtcbiAgICAgICAgICAgICAgICBjb25zdCB1aVRyYW5zZm9ybVNlcmlhbGl6ZWRQcm9wZXJ0aWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50U2l6ZTogJ19jb250ZW50U2l6ZScsXG4gICAgICAgICAgICAgICAgICAgIGFuY2hvclBvaW50OiAnX2FuY2hvclBvaW50JyxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcmlhbGl6ZWRQcm9wZXJ0eSA9IGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgPyB1aVRyYW5zZm9ybVNlcmlhbGl6ZWRQcm9wZXJ0aWVzW3Byb3BlcnR5XSB8fCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICA6IHByb3BlcnR5O1xuICAgICAgICAgICAgICAgIGNvbnN0IHJhd1Byb3BlcnR5RHVtcCA9IHJhd0NvbXBvbmVudC52YWx1ZT8uW3Byb3BlcnR5XVxuICAgICAgICAgICAgICAgICAgICB8fCByYXdDb21wb25lbnQudmFsdWU/LltzZXJpYWxpemVkUHJvcGVydHldXG4gICAgICAgICAgICAgICAgICAgIHx8IHJhd0NvbXBvbmVudC5wcm9wZXJ0aWVzPy5bcHJvcGVydHldXG4gICAgICAgICAgICAgICAgICAgIHx8IHJhd0NvbXBvbmVudC5wcm9wZXJ0aWVzPy5bc2VyaWFsaXplZFByb3BlcnR5XTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVRhcmdldFV1aWQgPSBub2RlVXVpZDtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVBhdGggPSByYXdQcm9wZXJ0eUR1bXA/LnBhdGhcbiAgICAgICAgICAgICAgICAgICAgfHwgYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS4ke3NlcmlhbGl6ZWRQcm9wZXJ0eX1gO1xuXG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggdGhlIENyZWF0b3IgSW5zcGVjdG9yIHRyYW5zYWN0aW9uIGJvdW5kYXJ5LiBXaXRob3V0IGFcbiAgICAgICAgICAgICAgICAvLyByZWNvcmRpbmcgdHJhbnNhY3Rpb24sIHNjZW5lOnNldC1wcm9wZXJ0eSBjYW4gdXBkYXRlIHRoZSBsaXZlXG4gICAgICAgICAgICAgICAgLy8gdmFsdWUgd2l0aG91dCByZWdpc3RlcmluZyBhIFByZWZhYiBvdmVycmlkZSBmb3IgYXBwbHktcHJlZmFiLlxuICAgICAgICAgICAgICAgIGNvbnN0IHVuZG9JZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2JlZ2luLXJlY29yZGluZycsIFtub2RlVXVpZF0pO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6LWE5rqQ57G75bGe5oCnXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2Fzc2V0JyB8fCBwcm9wZXJ0eVR5cGUgPT09ICdzcHJpdGVGcmFtZScgfHwgcHJvcGVydHlUeXBlID09PSAncHJlZmFiJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgKHByb3BlcnR5SW5mby50eXBlID09PSAnYXNzZXQnICYmIHByb3BlcnR5VHlwZSA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGFzc2V0IHJlZmVyZW5jZTpgLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHByb3BlcnR5VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVybWluZSBhc3NldCB0eXBlIGJhc2VkIG9uIHByb3BlcnR5IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFzc2V0VHlwZSA9ICdjYy5TcHJpdGVGcmFtZSc7IC8vIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RleHR1cmUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlRleHR1cmUyRCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbWF0ZXJpYWwnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLk1hdGVyaWFsJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdmb250JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5Gb250JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjbGlwJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5BdWRpb0NsaXAnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5QcmVmYWInO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBwcm9wZXJ0eVRhcmdldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBhc3NldFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvcicgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbpopzoibLlsZ7mgKfvvIznoa7kv51SR0JB5YC85q2j56GuXG4gICAgICAgICAgICAgICAgICAgIC8vIENvY29zIENyZWF0b3LpopzoibLlgLzojIPlm7TmmK8wLTI1NVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvclZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYTogcHJvY2Vzc2VkVmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBjb2xvciB2YWx1ZTpgLCBjb2xvclZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHByb3BlcnR5VGFyZ2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbG9yVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLkNvbG9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ZlYzMnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CGVmVjM+WxnuaAp1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZWMzVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS55KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnopIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHByb3BlcnR5VGFyZ2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZlYzNWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMyJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhlZlYzLlsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjMlZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcHJvcGVydHlUYXJnZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmVjMlZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5WZWMyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3NpemUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CGU2l6ZeWxnuaAp1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuaGVpZ2h0KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBwcm9wZXJ0eVRhcmdldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzaXplVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlNpemUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnbm9kZScgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0JyAmJiAndXVpZCcgaW4gcHJvY2Vzc2VkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g54m55q6K5aSE55CG6IqC54K55byV55SoXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgbm9kZSByZWZlcmVuY2Ugd2l0aCBVVUlEOiAke3Byb2Nlc3NlZFZhbHVlLnV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHByb3BlcnR5VGFyZ2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Ob2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbnu4Tku7blvJXnlKjvvJrpgJrov4foioLngrlVVUlE5om+5Yiw57uE5Lu255qEX19pZF9fXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVVdWlkID0gcHJvY2Vzc2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZSAtIGZpbmRpbmcgY29tcG9uZW50IG9uIG5vZGU6ICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDku47lvZPliY3nu4Tku7bnmoTlsZ7mgKflhYPmlbDmja7kuK3ojrflj5bmnJ/mnJvnmoTnu4Tku7bnsbvlnotcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5b2T5YmN57uE5Lu255qE6K+m57uG5L+h5oGv77yM5YyF5ous5bGe5oCn5YWD5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRDb21wb25lbnRJbmZvLnN1Y2Nlc3MgJiYgY3VycmVudENvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcz8uW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlNZXRhID0gY3VycmVudENvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO5bGe5oCn5YWD5pWw5o2u5Lit5o+Q5Y+W57uE5Lu257G75Z6L5L+h5oGvXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlNZXRhICYmIHR5cGVvZiBwcm9wZXJ0eU1ldGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJdHlwZeWtl+auteaMh+ekuue7hOS7tuexu+Wei1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU1ldGEudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBwcm9wZXJ0eU1ldGEudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5jdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieS6m+WxnuaAp+WPr+iDveS9v+eUqGN0b3LlrZfmrrVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLmN0b3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuZXh0ZW5kcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5TWV0YS5leHRlbmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6VleHRlbmRz5pWw57uE77yM6YCa5bi456ys5LiA5Liq5piv5pyA5YW35L2T55qE57G75Z6LXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXh0ZW5kVHlwZSBvZiBwcm9wZXJ0eU1ldGEuZXh0ZW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuZFR5cGUuc3RhcnRzV2l0aCgnY2MuJykgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLkNvbXBvbmVudCcgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLk9iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBleHRlbmRUeXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZGV0ZXJtaW5lIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlIGZvciBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIFByb3BlcnR5IG1ldGFkYXRhIG1heSBub3QgY29udGFpbiB0eXBlIGluZm9ybWF0aW9uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBEZXRlY3RlZCByZXF1aXJlZCBjb21wb25lbnQgdHlwZTogJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IGZvciBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bnm67moIfoioLngrnnmoTnu4Tku7bkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHRhcmdldE5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZURhdGEgfHwgIXRhcmdldE5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaJk+WNsOebruagh+iKgueCueeahOe7hOS7tuamguiniFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gaGFzICR7dGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLmxlbmd0aH0gY29tcG9uZW50czpgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGVEYXRhLl9fY29tcHNfXy5mb3JFYWNoKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUlkID0gY29tcC52YWx1ZSAmJiBjb21wLnZhbHVlLnV1aWQgJiYgY29tcC52YWx1ZS51dWlkLnZhbHVlID8gY29tcC52YWx1ZS51dWlkLnZhbHVlIDogJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbQ29tcG9uZW50VG9vbHNdIENvbXBvbmVudCAke2luZGV4fTogJHtjb21wLnR5cGV9IChzY2VuZV9pZDogJHtzY2VuZUlkfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmn6Xmib7lr7nlupTnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBvbmVudElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Zyo55uu5qCH6IqC54K555qEX2NvbXBvbmVudHPmlbDnu4TkuK3mn6Xmib7mjIflrprnsbvlnovnmoTnu4Tku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazqOaEj++8ml9fY29tcHNfX+WSjF9jb21wb25lbnRz55qE57Si5byV5piv5a+55bqU55qEXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBDaGVja2luZyBjb21wb25lbnQgJHtpfTogdHlwZT0ke2NvbXAudHlwZX0sIHRhcmdldD0ke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcC50eXBlID09PSBleHBlY3RlZENvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50ID0gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gRm91bmQgbWF0Y2hpbmcgY29tcG9uZW50IGF0IGluZGV4ICR7aX06ICR7Y29tcC50eXBlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuO57uE5Lu255qEdmFsdWUudXVpZC52YWx1ZeS4reiOt+WPlue7hOS7tuWcqOWcuuaZr+S4reeahElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudElkID0gY29tcC52YWx1ZS51dWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gR290IGNvbXBvbmVudElkIGZyb20gY29tcC52YWx1ZS51dWlkLnZhbHVlOiAke2NvbXBvbmVudElkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gQ29tcG9uZW50IHN0cnVjdHVyZTpgLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVmFsdWU6ICEhY29tcC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNVdWlkOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVXVpZFZhbHVlOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRTdHJ1Y3R1cmU6IGNvbXAudmFsdWUgPyBjb21wLnZhbHVlLnV1aWQgOiAnTm8gdmFsdWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGV4dHJhY3QgY29tcG9uZW50IElEIGZyb20gY29tcG9uZW50IHN0cnVjdHVyZWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5om+5Yiw77yM5YiX5Ye65Y+v55So57uE5Lu26K6p55So5oi35LqG6Kej77yM5pi+56S65Zy65pmv5Lit55qE55yf5a6eSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVDb21wb25lbnRzID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzY2VuZUlkID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDku47nu4Tku7bnmoR2YWx1ZS51dWlkLnZhbHVl6I635Y+W5Zy65pmvSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkICYmIGNvbXAudmFsdWUudXVpZC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVJZCA9IGNvbXAudmFsdWUudXVpZC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7Y29tcC50eXBlfShzY2VuZV9pZDoke3NjZW5lSWR9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21wb25lbnQgdHlwZSAnJHtleHBlY3RlZENvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlQ29tcG9uZW50cy5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0NvbXBvbmVudFRvb2xzXSBGb3VuZCBjb21wb25lbnQgJHtleHBlY3RlZENvbXBvbmVudFR5cGV9IHdpdGggc2NlbmUgSUQ6ICR7Y29tcG9uZW50SWR9IG9uIG5vZGUgJHt0YXJnZXROb2RlVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5pyf5pyb5YC85Li65a6e6ZmF55qE57uE5Lu2SUTlr7nosaHmoLzlvI/vvIznlKjkuo7lkI7nu63pqozor4FcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbEV4cGVjdGVkVmFsdWUgPSB7IHV1aWQ6IGNvbXBvbmVudElkIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwneivleS9v+eUqOS4juiKgueCuS/otYTmupDlvJXnlKjnm7jlkIznmoTmoLzlvI/vvJp7dXVpZDogY29tcG9uZW50SWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmtYvor5XnnIvmmK/lkKbog73mraPnoa7orr7nva7nu4Tku7blvJXnlKhcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBwcm9wZXJ0eVRhcmdldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHV1aWQ6IGNvbXBvbmVudElkIH0sICAvLyDkvb/nlKjlr7nosaHmoLzlvI/vvIzlg4/oioLngrkv6LWE5rqQ5byV55So5LiA5qC3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGV4cGVjdGVkQ29tcG9uZW50VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnbm9kZUFycmF5JyAmJiBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIboioLngrnmlbDnu4QgLSDkv53mjIHpooTlpITnkIbnmoTmoLzlvI9cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBub2RlIGFycmF5OmAsIHByb2Nlc3NlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHByb3BlcnR5VGFyZ2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlICAvLyDkv53mjIEgW3t1dWlkOiBcIi4uLlwifSwge3V1aWQ6IFwiLi4uXCJ9XSDmoLzlvI9cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvckFycmF5JyAmJiBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnibnmrorlpITnkIbpopzoibLmlbDnu4RcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JBcnJheVZhbHVlID0gcHJvY2Vzc2VkVmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0ucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IGl0ZW0uYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcHJvcGVydHlUYXJnZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29sb3JBcnJheVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIHByb3BlcnR5IHNldHRpbmcgZm9yIG5vbi1hc3NldCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHByb3BlcnR5VGFyZ2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHByb2Nlc3NlZFZhbHVlIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHNldEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRvSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NhbmNlbC1yZWNvcmRpbmcnLCB1bmRvSWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRocm93IHNldEVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodW5kb0lkKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2VuZC1yZWNvcmRpbmcnLCB1bmRvSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDU6IOetieW+hUVkaXRvcuWujOaIkOabtOaWsO+8jOeEtuWQjumqjOivgeiuvue9rue7k+aenFxuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTsgLy8g562J5b6FMjAwbXPorqlFZGl0b3LlrozmiJDmm7TmlrBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpY2F0aW9uID0gYXdhaXQgdGhpcy52ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIG9yaWdpbmFsVmFsdWUsIGFjdHVhbEV4cGVjdGVkVmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gU29tZSBlbmdpbmUgcHJvcGVydGllcyBleHBvc2VkIGJ5IEluc3BlY3RvciAoZm9yIGV4YW1wbGVcbiAgICAgICAgICAgICAgICAvLyBVSVRyYW5zZm9ybS5jb250ZW50U2l6ZSkgYXJlIGFjY2Vzc29ycyBiYWNrZWQgYnkgZGlmZmVyZW50bHkgbmFtZWRcbiAgICAgICAgICAgICAgICAvLyBzZXJpYWxpemVkIGZpZWxkcy4gc2NlbmU6c2V0LXByb3BlcnR5IG1heSByZXNvbHZlIHN1Y2Nlc3NmdWxseVxuICAgICAgICAgICAgICAgIC8vIHdpdGhvdXQgY2hhbmdpbmcgdGhlbS4gRm9yIHZhbHVlIHR5cGVzLCB1c2UgdGhlIGV4dGVuc2lvbidzIHNjZW5lXG4gICAgICAgICAgICAgICAgLy8gY29tcG9uZW50IHNldHRlciBhcyBhIHZlcmlmaWVkIGZhbGxiYWNrIHNvIHRoZSBlbmdpbmUgYXBwbGllcyB0aGVcbiAgICAgICAgICAgICAgICAvLyBwdWJsaWMgcHJvcGVydHkgY29udHJhY3QgaXRzZWxmLlxuICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lRmFsbGJhY2tUeXBlcyA9IG5ldyBTZXQoW1xuICAgICAgICAgICAgICAgICAgICAnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJywgJ2ludGVnZXInLCAnZmxvYXQnLFxuICAgICAgICAgICAgICAgICAgICAnY29sb3InLCAndmVjMicsICd2ZWMzJywgJ3NpemUnLFxuICAgICAgICAgICAgICAgICAgICAnY29sb3JBcnJheScsICdudW1iZXJBcnJheScsICdzdHJpbmdBcnJheScsXG4gICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgaWYgKCF2ZXJpZmljYXRpb24udmVyaWZpZWQgJiYgc2NlbmVGYWxsYmFja1R5cGVzLmhhcyhwcm9wZXJ0eVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrUmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXRDb21wb25lbnRQcm9wZXJ0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9jZXNzZWRWYWx1ZV1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmYWxsYmFja1Jlc3VsdD8uc3VjY2VzcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiA9IGF3YWl0IHRoaXMudmVyaWZ5UHJvcGVydHlDaGFuZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbEV4cGVjdGVkVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgc2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VWZXJpZmllZDogdmVyaWZpY2F0aW9uLnZlcmlmaWVkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgcHJvcGVydHk6YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gc2V0IHByb3BlcnR5OiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIHByaXZhdGUgYXN5bmMgYXR0YWNoU2NyaXB0KG5vZGVVdWlkOiBzdHJpbmcsIHNjcmlwdFBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g5LuO6ISa5pys6Lev5b6E5o+Q5Y+W57uE5Lu257G75ZCNXG4gICAgICAgICAgICBjb25zdCBzY3JpcHROYW1lID0gc2NyaXB0UGF0aC5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcudHMnLCAnJykucmVwbGFjZSgnLmpzJywgJycpO1xuICAgICAgICAgICAgaWYgKCFzY3JpcHROYW1lKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ludmFsaWQgc2NyaXB0IHBhdGgnIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyaXB0QXNzZXQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgc2NyaXB0UGF0aCkgYXMgYW55O1xuICAgICAgICAgICAgICAgIGlmICghc2NyaXB0QXNzZXQ/LnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFNjcmlwdCBhc3NldCBub3QgZm91bmQ6ICR7c2NyaXB0UGF0aH1gIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyaXB0Q2xhc3NJZCA9IHRoaXMudXVpZFRvQ29tcHJlc3NlZElkKHNjcmlwdEFzc2V0LnV1aWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoZXNTY3JpcHQgPSAoY29tcDogYW55KTogYm9vbGVhbiA9PiBjb21wLnR5cGUgPT09IHNjcmlwdE5hbWUgfHwgY29tcC50eXBlID09PSBzY3JpcHRDbGFzc0lkO1xuXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlLWNvbXBvbmVudCDkvb/nlKggQGNjY2xhc3Mg5rOo5YaM5ZCN77ybcXVlcnktbm9kZSDlr7noh6rlrprkuYnnu4Tku7bov5Tlm57ljovnvKnlkI7nmoQgY2xhc3NJZOOAglxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nU2NyaXB0ID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLmZpbmQobWF0Y2hlc1NjcmlwdCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1NjcmlwdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyBhbHJlYWR5IGV4aXN0cyBvbiBub2RlYCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBleGlzdGluZ1NjcmlwdC50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudDogc2NyaXB0TmFtZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvMiA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvMi5zdWNjZXNzICYmIGFsbENvbXBvbmVudHNJbmZvMi5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkU2NyaXB0ID0gYWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5maW5kKG1hdGNoZXNTY3JpcHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWRTY3JpcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYXR0YWNoZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBhZGRlZFNjcmlwdC50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyB3YXMgbm90IGZvdW5kIG9uIG5vZGUgYWZ0ZXIgYWRkaXRpb24uIEV4cGVjdGVkIGNpZDogJHtzY3JpcHRDbGFzc0lkfS4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBzY3JpcHQgYWRkaXRpb246ICR7YWxsQ29tcG9uZW50c0luZm8yLmVycm9yIHx8ICdVbmFibGUgdG8gZ2V0IG5vZGUgY29tcG9uZW50cyd9YFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gYXR0YWNoIHNjcmlwdDogJHtlcnIubWVzc2FnZX1gIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHV1aWRUb0NvbXByZXNzZWRJZCh1dWlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBhbHBoYWJldCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbiAgICAgICAgY29uc3QgaGV4ID0gdXVpZC5yZXBsYWNlKC8tL2csICcnKTtcbiAgICAgICAgaWYgKGhleC5sZW5ndGggIT09IDMyKSByZXR1cm4gdXVpZDtcblxuICAgICAgICBsZXQgcmVzdWx0ID0gaGV4LnNsaWNlKDAsIDUpO1xuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDU7IGluZGV4IDwgaGV4Lmxlbmd0aDsgaW5kZXggKz0gMykge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBOdW1iZXIucGFyc2VJbnQoaGV4LnNsaWNlKGluZGV4LCBpbmRleCArIDMpLCAxNik7XG4gICAgICAgICAgICByZXN1bHQgKz0gYWxwaGFiZXRbdmFsdWUgPj4gNl0gKyBhbHBoYWJldFt2YWx1ZSAmIDYzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXZhaWxhYmxlQ29tcG9uZW50cyhjYXRlZ29yeTogc3RyaW5nID0gJ2FsbCcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBjb21wb25lbnRDYXRlZ29yaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gICAgICAgICAgICByZW5kZXJlcjogWydjYy5TcHJpdGUnLCAnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnLCAnY2MuTWFzaycsICdjYy5HcmFwaGljcyddLFxuICAgICAgICAgICAgdWk6IFsnY2MuQnV0dG9uJywgJ2NjLlRvZ2dsZScsICdjYy5TbGlkZXInLCAnY2MuU2Nyb2xsVmlldycsICdjYy5FZGl0Qm94JywgJ2NjLlByb2dyZXNzQmFyJ10sXG4gICAgICAgICAgICBwaHlzaWNzOiBbJ2NjLlJpZ2lkQm9keTJEJywgJ2NjLkJveENvbGxpZGVyMkQnLCAnY2MuQ2lyY2xlQ29sbGlkZXIyRCcsICdjYy5Qb2x5Z29uQ29sbGlkZXIyRCddLFxuICAgICAgICAgICAgYW5pbWF0aW9uOiBbJ2NjLkFuaW1hdGlvbicsICdjYy5BbmltYXRpb25DbGlwJywgJ2NjLlNrZWxldGFsQW5pbWF0aW9uJ10sXG4gICAgICAgICAgICBhdWRpbzogWydjYy5BdWRpb1NvdXJjZSddLFxuICAgICAgICAgICAgbGF5b3V0OiBbJ2NjLkxheW91dCcsICdjYy5XaWRnZXQnLCAnY2MuUGFnZVZpZXcnLCAnY2MuUGFnZVZpZXdJbmRpY2F0b3InXSxcbiAgICAgICAgICAgIGVmZmVjdHM6IFsnY2MuTW90aW9uU3RyZWFrJywgJ2NjLlBhcnRpY2xlU3lzdGVtMkQnXSxcbiAgICAgICAgICAgIGNhbWVyYTogWydjYy5DYW1lcmEnXSxcbiAgICAgICAgICAgIGxpZ2h0OiBbJ2NjLkxpZ2h0JywgJ2NjLkRpcmVjdGlvbmFsTGlnaHQnLCAnY2MuUG9pbnRMaWdodCcsICdjYy5TcG90TGlnaHQnXVxuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBjb21wb25lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAnYWxsJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYXQgaW4gY29tcG9uZW50Q2F0ZWdvcmllcykge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmNvbmNhdChjb21wb25lbnRDYXRlZ29yaWVzW2NhdF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudENhdGVnb3JpZXNbY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzID0gY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50c1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+acieaViOeahOWxnuaAp+aPj+i/sOWvueixoVxuICAgICAgICBpZiAodHlwZW9mIHByb3BEYXRhICE9PSAnb2JqZWN0JyB8fCBwcm9wRGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BEYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6YG/5YWN6YGN5Y6G566A5Y2V55qE5pWw5YC85a+56LGh77yI5aaCIHt3aWR0aDogMjAwLCBoZWlnaHQ6IDE1MH3vvIlcbiAgICAgICAgICAgIGNvbnN0IGlzU2ltcGxlVmFsdWVPYmplY3QgPSBrZXlzLmV2ZXJ5KGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwcm9wRGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzU2ltcGxlVmFsdWVPYmplY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWMheWQq+WxnuaAp+aPj+i/sOespueahOeJueW+geWtl+aute+8jOS4jeS9v+eUqCdpbifmk43kvZznrKZcbiAgICAgICAgICAgIGNvbnN0IGhhc05hbWUgPSBrZXlzLmluY2x1ZGVzKCduYW1lJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGtleXMuaW5jbHVkZXMoJ3ZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNUeXBlID0ga2V5cy5pbmNsdWRlcygndHlwZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzRGlzcGxheU5hbWUgPSBrZXlzLmluY2x1ZGVzKCdkaXNwbGF5TmFtZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzUmVhZG9ubHkgPSBrZXlzLmluY2x1ZGVzKCdyZWFkb25seScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDlv4XpobvljIXlkKtuYW1l5oiWdmFsdWXlrZfmrrXvvIzkuJTpgJrluLjov5jmnIl0eXBl5a2X5q61XG4gICAgICAgICAgICBjb25zdCBoYXNWYWxpZFN0cnVjdHVyZSA9IChoYXNOYW1lIHx8IGhhc1ZhbHVlKSAmJiAoaGFzVHlwZSB8fCBoYXNEaXNwbGF5TmFtZSB8fCBoYXNSZWFkb25seSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOmineWkluajgOafpe+8muWmguaenOaciWRlZmF1bHTlrZfmrrXkuJTnu5PmnoTlpI3mnYLvvIzpgb/lhY3mt7HluqbpgY3ljoZcbiAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdkZWZhdWx0JykgJiYgcHJvcERhdGEuZGVmYXVsdCAmJiB0eXBlb2YgcHJvcERhdGEuZGVmYXVsdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0S2V5cyA9IE9iamVjdC5rZXlzKHByb3BEYXRhLmRlZmF1bHQpO1xuICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0S2V5cy5pbmNsdWRlcygndmFsdWUnKSAmJiB0eXBlb2YgcHJvcERhdGEuZGVmYXVsdC52YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6L+Z56eN5oOF5Ya15LiL77yM5oiR5Lus5Y+q6L+U5Zue6aG25bGC5bGe5oCn77yM5LiN5rex5YWl6YGN5Y6GZGVmYXVsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtpc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yXSBFcnJvciBjaGVja2luZyBwcm9wZXJ0eSBkZXNjcmlwdG9yOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYW5hbHl6ZVByb3BlcnR5KGNvbXBvbmVudDogYW55LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHsgZXhpc3RzOiBib29sZWFuOyB0eXBlOiBzdHJpbmc7IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdOyBvcmlnaW5hbFZhbHVlOiBhbnkgfSB7XG4gICAgICAgIC8vIOS7juWkjeadgueahOe7hOS7tue7k+aehOS4reaPkOWPluWPr+eUqOWxnuaAp1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQcm9wZXJ0aWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgcHJvcGVydHlWYWx1ZTogYW55ID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcHJvcGVydHlFeGlzdHMgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIOWwneivleWkmuenjeaWueW8j+afpeaJvuWxnuaAp++8mlxuICAgICAgICAvLyAxLiDnm7TmjqXlsZ7mgKforr/pl65cbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb21wb25lbnQsIHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBjb21wb25lbnRbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gMi4g5LuO5bWM5aWX57uT5p6E5Lit5p+l5om+ICjlpoLku47mtYvor5XmlbDmja7nnIvliLDnmoTlpI3mnYLnu5PmnoQpXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMgJiYgY29tcG9uZW50LnByb3BlcnRpZXMgJiYgdHlwZW9mIGNvbXBvbmVudC5wcm9wZXJ0aWVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8g6aaW5YWI5qOA5p+lcHJvcGVydGllcy52YWx1ZeaYr+WQpuWtmOWcqO+8iOi/meaYr+aIkeS7rOWcqGdldENvbXBvbmVudHPkuK3nnIvliLDnmoTnu5PmnoTvvIlcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVPYmogPSBjb21wb25lbnQucHJvcGVydGllcy52YWx1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZU9iaikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+lcHJvcERhdGHmmK/lkKbmmK/kuIDkuKrmnInmlYjnmoTlsZ7mgKfmj4/ov7Dlr7nosaFcbiAgICAgICAgICAgICAgICAgICAgLy8g56Gu5L+dcHJvcERhdGHmmK/lr7nosaHkuJTljIXlkKvpooTmnJ/nmoTlsZ7mgKfnu5PmnoRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvJjlhYjkvb/nlKh2YWx1ZeWxnuaAp++8jOWmguaenOayoeacieWImeS9v+eUqHByb3BEYXRh5pys6LqrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5qOA5p+l5aSx6LSl77yM55u05o6l5L2/55SocHJvcEluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIOWkh+eUqOaWueahiO+8muebtOaOpeS7jnByb3BlcnRpZXPmn6Xmib5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyhjb21wb25lbnQucHJvcGVydGllcykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvJjlhYjkvb/nlKh2YWx1ZeWxnuaAp++8jOWmguaenOayoeacieWImeS9v+eUqHByb3BEYXRh5pys6LqrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5qOA5p+l5aSx6LSl77yM55u05o6l5L2/55SocHJvcEluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIDMuIOS7juebtOaOpeWxnuaAp+S4reaPkOWPlueugOWNleWxnuaAp+WQjVxuICAgICAgICBpZiAoYXZhaWxhYmxlUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWtleS5zdGFydHNXaXRoKCdfJykgJiYgIVsnX190eXBlX18nLCAnY2lkJywgJ25vZGUnLCAndXVpZCcsICduYW1lJywgJ2VuYWJsZWQnLCAndHlwZScsICdyZWFkb25seScsICd2aXNpYmxlJ10uaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAndW5rbm93bicsXG4gICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiB1bmRlZmluZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCB0eXBlID0gJ3Vua25vd24nO1xuICAgICAgICBcbiAgICAgICAgLy8g5pm66IO957G75Z6L5qOA5rWLXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5VmFsdWUpKSB7XG4gICAgICAgICAgICAvLyDmlbDnu4Tnsbvlnovmo4DmtYtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlQXJyYXknO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY29sb3InKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3JBcnJheSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJvcGVydHkgbmFtZSBzdWdnZXN0cyBpdCdzIGFuIGFzc2V0XG4gICAgICAgICAgICBpZiAoWydzcHJpdGVGcmFtZScsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ2ZvbnQnLCAnY2xpcCcsICdwcmVmYWInXS5pbmNsdWRlcyhwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdHlwZSA9ICdudW1iZXInO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnYm9vbGVhbic7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSAmJiB0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdyJykgJiYga2V5cy5pbmNsdWRlcygnZycpICYmIGtleXMuaW5jbHVkZXMoJ2InKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbG9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ3gnKSAmJiBrZXlzLmluY2x1ZGVzKCd5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHByb3BlcnR5VmFsdWUueiAhPT0gdW5kZWZpbmVkID8gJ3ZlYzMnIDogJ3ZlYzInO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygnd2lkdGgnKSAmJiBrZXlzLmluY2x1ZGVzKCdoZWlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ3NpemUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygndXVpZCcpIHx8IGtleXMuaW5jbHVkZXMoJ19fdXVpZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv6IqC54K55byV55So77yI6YCa6L+H5bGe5oCn5ZCN5oiWX19pZF9f5bGe5oCn5Yik5pat77yJXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzLmluY2x1ZGVzKCdfX2lkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCdfX2lkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyDoioLngrnlvJXnlKjnibnlvoFcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ29iamVjdCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFthbmFseXplUHJvcGVydHldIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IHR5cGUgZm9yOiAke0pTT04uc3RyaW5naWZ5KHByb3BlcnR5VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVZhbHVlID09PSBudWxsIHx8IHByb3BlcnR5VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gRm9yIG51bGwvdW5kZWZpbmVkIHZhbHVlcywgY2hlY2sgcHJvcGVydHkgbmFtZSB0byBkZXRlcm1pbmUgdHlwZVxuICAgICAgICAgICAgaWYgKFsnc3ByaXRlRnJhbWUnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdmb250JywgJ2NsaXAnLCAncHJlZmFiJ10uaW5jbHVkZXMocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbXBvbmVudCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb21wb25lbnQnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXhpc3RzOiB0cnVlLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiBwcm9wZXJ0eVZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzbWFydENvbnZlcnRWYWx1ZShpbnB1dFZhbHVlOiBhbnksIHByb3BlcnR5SW5mbzogYW55KTogYW55IHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBvcmlnaW5hbFZhbHVlIH0gPSBwcm9wZXJ0eUluZm87XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW3NtYXJ0Q29udmVydFZhbHVlXSBDb252ZXJ0aW5nICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9IHRvIHR5cGU6ICR7dHlwZX1gKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGlucHV0VmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnYm9vbGVhbicpIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RydWUnIHx8IGlucHV0VmFsdWUgPT09ICcxJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oaW5wdXRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6XG4gICAgICAgICAgICAgICAgLy8g5LyY5YyW55qE6aKc6Imy5aSE55CG77yM5pSv5oyB5aSa56eN6L6T5YWl5qC85byPXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDlrZfnrKbkuLLmoLzlvI/vvJrljYHlha3ov5vliLbjgIHpopzoibLlkI3np7DjgIFyZ2IoKS9yZ2JhKClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VDb2xvclN0cmluZyhpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dEtleXMgPSBPYmplY3Qua2V5cyhpbnB1dFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOi+k+WFpeaYr+minOiJsuWvueixoe+8jOmqjOivgeW5tui9rOaNolxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0S2V5cy5pbmNsdWRlcygncicpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnZycpIHx8IGlucHV0S2V5cy5pbmNsdWRlcygnYicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaW5wdXRWYWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaW5wdXRWYWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpbnB1dFZhbHVlLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIEludmFsaWQgY29sb3Igb2JqZWN0OiAke0pTT04uc3RyaW5naWZ5KGlucHV0VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIOWmguaenOacieWOn+WAvO+8jOS/neaMgeWOn+WAvOe7k+aehOW5tuabtOaWsOaPkOS+m+eahOWAvFxuICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFZhbHVlICYmIHR5cGVvZiBvcmlnaW5hbFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRLZXlzID0gdHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgPyBPYmplY3Qua2V5cyhpbnB1dFZhbHVlKSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBpbnB1dEtleXMuaW5jbHVkZXMoJ3InKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUucikpKSA6IChvcmlnaW5hbFZhbHVlLnIgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2cnKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuZykpKSA6IChvcmlnaW5hbFZhbHVlLmcgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2InKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYikpKSA6IChvcmlnaW5hbFZhbHVlLmIgfHwgMjU1KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpbnB1dEtleXMuaW5jbHVkZXMoJ2EnKSA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGlucHV0VmFsdWUuYSkpKSA6IChvcmlnaW5hbFZhbHVlLmEgfHwgMjU1KVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW3NtYXJ0Q29udmVydFZhbHVlXSBFcnJvciBwcm9jZXNzaW5nIGNvbG9yIHdpdGggb3JpZ2luYWwgdmFsdWU6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8g6buY6K6k6L+U5Zue55m96ImyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbc21hcnRDb252ZXJ0VmFsdWVdIFVzaW5nIGRlZmF1bHQgd2hpdGUgY29sb3IgZm9yIGludmFsaWQgaW5wdXQ6ICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRWYWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICd2ZWMyJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKGlucHV0VmFsdWUueSkgfHwgb3JpZ2luYWxWYWx1ZS55IHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICd2ZWMzJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdvYmplY3QnICYmIGlucHV0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihpbnB1dFZhbHVlLngpIHx8IG9yaWdpbmFsVmFsdWUueCB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKGlucHV0VmFsdWUueSkgfHwgb3JpZ2luYWxWYWx1ZS55IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB6OiBOdW1iZXIoaW5wdXRWYWx1ZS56KSB8fCBvcmlnaW5hbFZhbHVlLnogfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5wdXRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgaW5wdXRWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IE51bWJlcihpbnB1dFZhbHVlLndpZHRoKSB8fCBvcmlnaW5hbFZhbHVlLndpZHRoIHx8IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKGlucHV0VmFsdWUuaGVpZ2h0KSB8fCBvcmlnaW5hbFZhbHVlLmhlaWdodCB8fCAxMDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdub2RlJzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiKgueCueW8leeUqOmcgOimgeeJueauiuWkhOeQhlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOW3sue7j+aYr+WvueixoeW9ouW8j++8jOi/lOWbnlVVSUTmiJblrozmlbTlr7nosaFcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlucHV0VmFsdWUudXVpZCB8fCBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlucHV0VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOi+k+WFpeaYr+Wtl+espuS4sui3r+W+hO+8jOi9rOaNouS4umFzc2V05a+56LGhXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGlucHV0VmFsdWUgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSAnb2JqZWN0JyAmJiBpbnB1dFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnB1dFZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8g5a+55LqO5pyq55+l57G75Z6L77yM5bC96YeP5L+d5oyB5Y6f5pyJ57uT5p6EXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnB1dFZhbHVlID09PSB0eXBlb2Ygb3JpZ2luYWxWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXRWYWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAgICAgcHJpdmF0ZSBwYXJzZUNvbG9yU3RyaW5nKGNvbG9yU3RyOiBzdHJpbmcpOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3Qgc3RyID0gY29sb3JTdHIudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8g5Y+q5pSv5oyB5Y2B5YWt6L+b5Yi25qC85byPICNSUkdHQkIg5oiWICNSUkdHQkJBQVxuICAgICAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDcpIHsgLy8gI1JSR0dCQlxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGE6IDI1NSB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHIubGVuZ3RoID09PSA5KSB7IC8vICNSUkdHQkJBQVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDcsIDkpLCAxNik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgciwgZywgYiwgYSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDlpoLmnpzkuI3mmK/mnInmlYjnmoTljYHlha3ov5vliLbmoLzlvI/vvIzov5Tlm57plJnor6/mj5DnpLpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbG9yIGZvcm1hdDogXCIke2NvbG9yU3RyfVwiLiBPbmx5IGhleGFkZWNpbWFsIGZvcm1hdCBpcyBzdXBwb3J0ZWQgKGUuZy4sIFwiI0ZGMDAwMFwiIG9yIFwiI0ZGMDAwMEZGXCIpYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2ZXJpZnlQcm9wZXJ0eUNoYW5nZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIG9yaWdpbmFsVmFsdWU6IGFueSwgZXhwZWN0ZWRWYWx1ZTogYW55KTogUHJvbWlzZTx7IHZlcmlmaWVkOiBib29sZWFuOyBhY3R1YWxWYWx1ZTogYW55OyBmdWxsRGF0YTogYW55IH0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gU3RhcnRpbmcgdmVyaWZpY2F0aW9uIGZvciAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEV4cGVjdGVkIHZhbHVlOmAsIEpTT04uc3RyaW5naWZ5KGV4cGVjdGVkVmFsdWUpKTtcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gT3JpZ2luYWwgdmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkob3JpZ2luYWxWYWx1ZSkpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIOmHjeaWsOiOt+WPlue7hOS7tuS/oeaBr+i/m+ihjOmqjOivgVxuICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gQ2FsbGluZyBnZXRDb21wb25lbnRJbmZvLi4uYCk7XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIGdldENvbXBvbmVudEluZm8gc3VjY2VzczpgLCBjb21wb25lbnRJbmZvLnN1Y2Nlc3MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIGdldENvbXBvbmVudHMgc3VjY2VzczpgLCBhbGxDb21wb25lbnRzLnN1Y2Nlc3MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5mby5zdWNjZXNzICYmIGNvbXBvbmVudEluZm8uZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENvbXBvbmVudCBkYXRhIGF2YWlsYWJsZSwgZXh0cmFjdGluZyBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsUHJvcGVydHlOYW1lcyA9IE9iamVjdC5rZXlzKGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzIHx8IHt9KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBBdmFpbGFibGUgcHJvcGVydGllczpgLCBhbGxQcm9wZXJ0eU5hbWVzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURhdGEgPSBjb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllcz8uW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSYXcgcHJvcGVydHkgZGF0YSBmb3IgJyR7cHJvcGVydHl9JzpgLCBKU09OLnN0cmluZ2lmeShwcm9wZXJ0eURhdGEpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDku47lsZ7mgKfmlbDmja7kuK3mj5Dlj5blrp7pmYXlgLxcbiAgICAgICAgICAgICAgICBsZXQgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gSW5pdGlhbCBhY3R1YWxWYWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eURhdGEgJiYgdHlwZW9mIHByb3BlcnR5RGF0YSA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiBwcm9wZXJ0eURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEV4dHJhY3RlZCBhY3R1YWxWYWx1ZSBmcm9tIC52YWx1ZTpgLCBKU09OLnN0cmluZ2lmeShhY3R1YWxWYWx1ZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIE5vIC52YWx1ZSBwcm9wZXJ0eSBmb3VuZCwgdXNpbmcgcmF3IGRhdGFgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g5L+u5aSN6aqM6K+B6YC76L6R77ya5qOA5p+l5a6e6ZmF5YC85piv5ZCm5Yy56YWN5pyf5pyb5YC8XG4gICAgICAgICAgICAgICAgbGV0IHZlcmlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBleHBlY3RlZFZhbHVlID09PSAnb2JqZWN0JyAmJiBleHBlY3RlZFZhbHVlICE9PSBudWxsICYmICd1dWlkJyBpbiBleHBlY3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWvueS6juW8leeUqOexu+Wei++8iOiKgueCuS/nu4Tku7Yv6LWE5rqQ77yJ77yM5q+U6L6DVVVJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxVdWlkID0gYWN0dWFsVmFsdWUgJiYgdHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiAndXVpZCcgaW4gYWN0dWFsVmFsdWUgPyBhY3R1YWxWYWx1ZS51dWlkIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVXVpZCA9IGV4cGVjdGVkVmFsdWUudXVpZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWQgJiYgZXhwZWN0ZWRVdWlkICE9PSAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJlZmVyZW5jZSBjb21wYXJpc29uOmApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEV4cGVjdGVkIFVVSUQ6IFwiJHtleHBlY3RlZFV1aWR9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBBY3R1YWwgVVVJRDogXCIke2FjdHVhbFV1aWR9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBVVUlEIG1hdGNoOiAke2FjdHVhbFV1aWQgPT09IGV4cGVjdGVkVXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBVVUlEIG5vdCBlbXB0eTogJHtleHBlY3RlZFV1aWQgIT09ICcnfWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEZpbmFsIHZlcmlmaWVkOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWvueS6juWFtuS7luexu+Wei++8jOebtOaOpeavlOi+g+WAvFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBWYWx1ZSBjb21wYXJpc29uOmApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIEV4cGVjdGVkIHR5cGU6ICR7dHlwZW9mIGV4cGVjdGVkVmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gQWN0dWFsIHR5cGU6ICR7dHlwZW9mIGFjdHVhbFZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gdHlwZW9mIGV4cGVjdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsVmFsdWUgPT09ICdvYmplY3QnICYmIGFjdHVhbFZhbHVlICE9PSBudWxsICYmIGV4cGVjdGVkVmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlr7nosaHnsbvlnovnmoTmt7Hluqbmr5TovoNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSA9PT0gSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBPYmplY3QgY29tcGFyaXNvbiAoSlNPTik6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWfuuacrOexu+Wei+eahOebtOaOpeavlOi+g1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gYWN0dWFsVmFsdWUgPT09IGV4cGVjdGVkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBEaXJlY3QgY29tcGFyaXNvbjogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOexu+Wei+S4jeWMuemFjeaXtueahOeJueauiuWkhOeQhu+8iOWmguaVsOWtl+WSjOWtl+espuS4su+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaW5nTWF0Y2ggPSBTdHJpbmcoYWN0dWFsVmFsdWUpID09PSBTdHJpbmcoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBudW1iZXJNYXRjaCA9IE51bWJlcihhY3R1YWxWYWx1ZSkgPT09IE51bWJlcihleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gc3RyaW5nTWF0Y2ggfHwgbnVtYmVyTWF0Y2g7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtIFN0cmluZyBtYXRjaDogJHtzdHJpbmdNYXRjaH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgIC0gTnVtYmVyIG1hdGNoOiAke251bWJlck1hdGNofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgLSBUeXBlIG1pc21hdGNoIHZlcmlmaWVkOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEZpbmFsIHZlcmlmaWNhdGlvbiByZXN1bHQ6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRmluYWwgYWN0dWFsVmFsdWU6YCwgSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgZnVsbERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWPqui/lOWbnuS/ruaUueeahOWxnuaAp+S/oeaBr++8jOS4jei/lOWbnuWujOaVtOe7hOS7tuaVsOaNrlxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRQcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogb3JpZ2luYWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TWV0YWRhdGE6IHByb3BlcnR5RGF0YSAvLyDlj6rljIXlkKvov5nkuKrlsZ7mgKfnmoTlhYPmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDnroDljJbnmoTnu4Tku7bkv6Hmga9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN1bW1hcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsUHJvcGVydGllczogT2JqZWN0LmtleXMoY29tcG9uZW50SW5mby5kYXRhPy5wcm9wZXJ0aWVzIHx8IHt9KS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmV0dXJuaW5nIHJlc3VsdDpgLCBKU09OLnN0cmluZ2lmeShyZXN1bHQsIG51bGwsIDIpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDb21wb25lbnRJbmZvIGZhaWxlZCBvciBubyBkYXRhOmAsIGNvbXBvbmVudEluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBWZXJpZmljYXRpb24gZmFpbGVkIHdpdGggZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBFcnJvciBzdGFjazonLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiAnTm8gc3RhY2sgdHJhY2UnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gUmV0dXJuaW5nIGZhbGxiYWNrIHJlc3VsdGApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmVyaWZpZWQ6IGZhbHNlLFxuICAgICAgICAgICAgYWN0dWFsVmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGZ1bGxEYXRhOiBudWxsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qOA5rWL5piv5ZCm5Li66IqC54K55bGe5oCn77yM5aaC5p6c5piv5YiZ6YeN5a6a5ZCR5Yiw5a+55bqU55qE6IqC54K55pa55rOVXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja0FuZFJlZGlyZWN0Tm9kZVByb3BlcnRpZXMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2UgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlIH0gPSBhcmdzO1xuICAgICAgICBcbiAgICAgICAgLy8g5qOA5rWL5piv5ZCm5Li66IqC54K55Z+656GA5bGe5oCn77yI5bqU6K+l5L2/55SoIHNldF9ub2RlX3Byb3BlcnR577yJXG4gICAgICAgIGNvbnN0IG5vZGVCYXNpY1Byb3BlcnRpZXMgPSBbXG4gICAgICAgICAgICAnbmFtZScsICdhY3RpdmUnLCAnbGF5ZXInLCAnbW9iaWxpdHknLCAncGFyZW50JywgJ2NoaWxkcmVuJywgJ2hpZGVGbGFncydcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIOajgOa1i+aYr+WQpuS4uuiKgueCueWPmOaNouWxnuaAp++8iOW6lOivpeS9v+eUqCBzZXRfbm9kZV90cmFuc2Zvcm3vvIlcbiAgICAgICAgY29uc3Qgbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMgPSBbXG4gICAgICAgICAgICAncG9zaXRpb24nLCAncm90YXRpb24nLCAnc2NhbGUnLCAnZXVsZXJBbmdsZXMnLCAnYW5nbGUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlY3QgYXR0ZW1wdHMgdG8gc2V0IGNjLk5vZGUgcHJvcGVydGllcyAoY29tbW9uIG1pc3Rha2UpXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuTm9kZScgfHwgY29tcG9uZW50VHlwZSA9PT0gJ05vZGUnKSB7XG4gICAgICAgICAgICBpZiAobm9kZUJhc2ljUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgYmFzaWMgcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3Byb3BlcnR5IG1ldGhvZCB0byBzZXQgbm9kZSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV9wcm9wZXJ0eSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiLCB2YWx1ZT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSB0cmFuc2Zvcm0gcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3RyYW5zZm9ybSBtZXRob2QgdG8gc2V0IHRyYW5zZm9ybSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV90cmFuc2Zvcm0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7cHJvcGVydHl9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIERldGVjdCBjb21tb24gaW5jb3JyZWN0IHVzYWdlXG4gICAgICAgICAgaWYgKG5vZGVCYXNpY1Byb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpIHx8IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICBjb25zdCBtZXRob2ROYW1lID0gbm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gJ3NldF9ub2RlX3RyYW5zZm9ybScgOiAnc2V0X25vZGVfcHJvcGVydHknO1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHNob3VsZCBiZSBzZXQgdXNpbmcgJHttZXRob2ROYW1lfSBtZXRob2QsIG5vdCBzZXRfY29tcG9uZW50X3Byb3BlcnR5LiBQbGVhc2UgdXNlOiAke21ldGhvZE5hbWV9KHV1aWQ9XCIke25vZGVVdWlkfVwiLCAke25vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSA/IHByb3BlcnR5IDogYHByb3BlcnR5PVwiJHtwcm9wZXJ0eX1cImB9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiBudWxsOyAvLyDkuI3mmK/oioLngrnlsZ7mgKfvvIznu6fnu63mraPluLjlpITnkIZcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiDnlJ/miJDnu4Tku7blu7rorq7kv6Hmga9cbiAgICAgICAqL1xuICAgICAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudFN1Z2dlc3Rpb24ocmVxdWVzdGVkVHlwZTogc3RyaW5nLCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10sIHByb3BlcnR5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOebuOS8vOeahOe7hOS7tuexu+Wei1xuICAgICAgICAgIGNvbnN0IHNpbWlsYXJUeXBlcyA9IGF2YWlsYWJsZVR5cGVzLmZpbHRlcih0eXBlID0+IFxuICAgICAgICAgICAgICB0eXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocmVxdWVzdGVkVHlwZS50b0xvd2VyQ2FzZSgpKSB8fCBcbiAgICAgICAgICAgICAgcmVxdWVzdGVkVHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHR5cGUudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIFxuICAgICAgICAgIGxldCBpbnN0cnVjdGlvbiA9ICcnO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChzaW1pbGFyVHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+UjSBGb3VuZCBzaW1pbGFyIGNvbXBvbmVudHM6ICR7c2ltaWxhclR5cGVzLmpvaW4oJywgJyl9YDtcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbvCfkqEgU3VnZ2VzdGlvbjogUGVyaGFwcyB5b3UgbWVhbnQgdG8gc2V0IHRoZSAnJHtzaW1pbGFyVHlwZXNbMF19JyBjb21wb25lbnQ/YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVjb21tZW5kIHBvc3NpYmxlIGNvbXBvbmVudHMgYmFzZWQgb24gcHJvcGVydHkgbmFtZVxuICAgICAgICAgIGNvbnN0IHByb3BlcnR5VG9Db21wb25lbnRNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgICAgJ3N0cmluZyc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnLCAnY2MuRWRpdEJveCddLFxuICAgICAgICAgICAgICAndGV4dCc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcbiAgICAgICAgICAgICAgJ2ZvbnRTaXplJzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxuICAgICAgICAgICAgICAnc3ByaXRlRnJhbWUnOiBbJ2NjLlNwcml0ZSddLFxuICAgICAgICAgICAgICAnY29sb3InOiBbJ2NjLkxhYmVsJywgJ2NjLlNwcml0ZScsICdjYy5HcmFwaGljcyddLFxuICAgICAgICAgICAgICAnbm9ybWFsQ29sb3InOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgICAncHJlc3NlZENvbG9yJzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICAgJ3RhcmdldCc6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAgICdjb250ZW50U2l6ZSc6IFsnY2MuVUlUcmFuc2Zvcm0nXSxcbiAgICAgICAgICAgICAgJ2FuY2hvclBvaW50JzogWydjYy5VSVRyYW5zZm9ybSddXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICBjb25zdCByZWNvbW1lbmRlZENvbXBvbmVudHMgPSBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwW3Byb3BlcnR5XSB8fCBbXTtcbiAgICAgICAgICBjb25zdCBhdmFpbGFibGVSZWNvbW1lbmRlZCA9IHJlY29tbWVuZGVkQ29tcG9uZW50cy5maWx0ZXIoY29tcCA9PiBhdmFpbGFibGVUeXBlcy5pbmNsdWRlcyhjb21wKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGF2YWlsYWJsZVJlY29tbWVuZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCfjq8gQmFzZWQgb24gcHJvcGVydHkgJyR7cHJvcGVydHl9JywgcmVjb21tZW5kZWQgY29tcG9uZW50czogJHthdmFpbGFibGVSZWNvbW1lbmRlZC5qb2luKCcsICcpfWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFByb3ZpZGUgb3BlcmF0aW9uIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCfk4sgU3VnZ2VzdGVkIEFjdGlvbnM6YDtcbiAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMS4gVXNlIGdldF9jb21wb25lbnRzKG5vZGVVdWlkPVwiJHtyZXF1ZXN0ZWRUeXBlLmluY2x1ZGVzKCd1dWlkJykgPyAnWU9VUl9OT0RFX1VVSUQnIDogJ25vZGVVdWlkJ31cIikgdG8gdmlldyBhbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZWA7XG4gICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjIuIElmIHlvdSBuZWVkIHRvIGFkZCBhIGNvbXBvbmVudCwgdXNlIGFkZF9jb21wb25lbnQobm9kZVV1aWQ9XCIuLi5cIiwgY29tcG9uZW50VHlwZT1cIiR7cmVxdWVzdGVkVHlwZX1cIilgO1xuICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4zLiBWZXJpZnkgdGhhdCB0aGUgY29tcG9uZW50IHR5cGUgbmFtZSBpcyBjb3JyZWN0IChjYXNlLXNlbnNpdGl2ZSlgO1xuICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOW/q+mAn+mqjOivgei1hOa6kOiuvue9rue7k+aenFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgcXVpY2tWZXJpZnlBc3NldChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmF3Tm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFyYXdOb2RlRGF0YSB8fCAhcmF3Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOaJvuWIsOe7hOS7tlxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gcmF3Tm9kZURhdGEuX19jb21wc19fLmZpbmQoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCBjb21wLnR5cGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBUeXBlID09PSBjb21wb25lbnRUeXBlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOaPkOWPluWxnuaAp+WAvFxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGF0YSA9IHByb3BlcnRpZXNbcHJvcGVydHldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcGVydHlEYXRhICYmIHR5cGVvZiBwcm9wZXJ0eURhdGEgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gcHJvcGVydHlEYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5RGF0YS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5RGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtxdWlja1ZlcmlmeUFzc2V0XSBFcnJvcjpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==