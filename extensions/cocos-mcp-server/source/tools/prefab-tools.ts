import { ToolDefinition, ToolResponse, ToolExecutor, PrefabInfo } from '../types';

export class PrefabTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_prefab_list',
                description: 'Get all prefabs in the project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        folder: {
                            type: 'string',
                            description: 'Folder path to search (optional)',
                            default: 'db://assets'
                        }
                    }
                }
            },
            {
                name: 'load_prefab',
                description: 'Load a prefab by path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'instantiate_prefab',
                description: 'Instantiate a prefab in the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID (optional)'
                        },
                        position: {
                            type: 'object',
                            description: 'Initial position',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'create_prefab',
                description: 'Create a prefab from a node with all children and components',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the prefab (e.g., db://assets/prefabs/MyPrefab.prefab)'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'Prefab name'
                        }
                    },
                    required: ['nodeUuid', 'savePath', 'prefabName']
                }
            },
            {
                name: 'update_prefab',
                description: 'Update an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID with changes'
                        }
                    },
                    required: ['prefabPath', 'nodeUuid']
                }
            },
            {
                name: 'revert_prefab',
                description: 'Revert prefab instance to original',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        }
                    },
                    required: ['nodeUuid']
                }
            },
            {
                name: 'get_prefab_info',
                description: 'Get detailed prefab information',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'validate_prefab',
                description: 'Validate a prefab file format',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path'
                        }
                    },
                    required: ['prefabPath']
                }
            },
            {
                name: 'duplicate_prefab',
                description: 'Duplicate an existing prefab',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourcePrefabPath: {
                            type: 'string',
                            description: 'Source prefab path'
                        },
                        targetPrefabPath: {
                            type: 'string',
                            description: 'Target prefab path'
                        },
                        newPrefabName: {
                            type: 'string',
                            description: 'New prefab name'
                        }
                    },
                    required: ['sourcePrefabPath', 'targetPrefabPath']
                }
            },
            {
                name: 'restore_prefab_node',
                description: 'Restore prefab node using prefab asset (built-in undo record)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID'
                        }
                    },
                    required: ['nodeUuid', 'assetUuid']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_prefab_list':
                return await this.getPrefabList(args.folder);
            case 'load_prefab':
                return await this.loadPrefab(args.prefabPath);
            case 'instantiate_prefab':
                return await this.instantiatePrefab(args);
            case 'create_prefab':
                return await this.createPrefab(args);
            case 'update_prefab':
                return await this.updatePrefab(args.prefabPath, args.nodeUuid);
            case 'revert_prefab':
                return await this.revertPrefab(args.nodeUuid);
            case 'get_prefab_info':
                return await this.getPrefabInfo(args.prefabPath);
            case 'validate_prefab':
                return await this.validatePrefab(args.prefabPath);
            case 'duplicate_prefab':
                return await this.duplicatePrefab(args);
            case 'restore_prefab_node':
                return await this.restorePrefabNode(args.nodeUuid, args.assetUuid);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async getPrefabList(folder: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ? 
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
            
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results: any[]) => {
                const prefabs: PrefabInfo[] = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async loadPrefab(prefabPath: string): Promise<ToolResponse> {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath) as any;
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }
            if (assetInfo.type && assetInfo.type !== 'cc.Prefab') {
                throw new Error(`Asset is not a Prefab: ${assetInfo.type}`);
            }

            await Editor.Message.request('asset-db', 'open-asset', assetInfo.uuid);
            return {
                success: true,
                data: {
                    uuid: assetInfo.uuid,
                    name: assetInfo.name,
                    path: assetInfo.url ?? prefabPath,
                    message: 'Prefab opened successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // 获取预制体资源信息
                const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
                if (!assetInfo) {
                    throw new Error('预制体未找到');
                }

                // 使用正确的 create-node API 从预制体资源实例化
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid,
                    type: 'cc.Prefab',
                    unlinkPrefab: false,
                    snapshot: true
                };

                // 设置父节点
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                // 设置节点名称
                if (args.name) {
                    createNodeOptions.name = args.name;
                } else if (assetInfo.name) {
                    createNodeOptions.name = assetInfo.name;
                }

                // 设置初始属性（如位置）
                if (args.position) {
                    createNodeOptions.position = args.position;
                }

                // 创建节点
                const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;

                const nodeDump = await Editor.Message.request('scene', 'query-node', uuid) as any;
                const prefabDump = nodeDump?.__prefab__;
                const rootUuid = prefabDump?.rootUuid || prefabDump?.value?.rootUuid;
                if (!rootUuid) {
                    resolve({
                        success: false,
                        error: `Creator created node '${uuid}' without a verifiable Prefab link`,
                        data: {
                            nodeUuid: uuid,
                            prefabState: prefabDump ?? null,
                            nodeDumpKeys: Object.keys(nodeDump || {})
                        }
                    });
                    return;
                }

                // 注意：create-node API从预制体资源创建时应该自动建立预制体关联
                console.log('预制体节点创建成功:', {
                    nodeUuid: uuid,
                    prefabUuid: assetInfo.uuid,
                    prefabPath: args.prefabPath
                });
                
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        prefabPath: args.prefabPath,
                        parentUuid: args.parentUuid,
                        position: args.position,
                        rootUuid,
                        message: '预制体实例化成功，已验证预制体关联'
                    }
                });
            } catch (err: any) {
                resolve({ 
                    success: false, 
                    error: `预制体实例化失败: ${err.message}`,
                    instruction: '请检查预制体路径是否正确，确保预制体文件格式正确'
                });
            }
        });
    }

    /**
     * 建立节点与预制体的关联关系
     * 这个方法创建必要的PrefabInfo和PrefabInstance结构
     */
    private async establishPrefabConnection(nodeUuid: string, prefabUuid: string, prefabPath: string): Promise<void> {
        try {
            // 读取预制体文件获取根节点的fileId
            const prefabContent = await this.readPrefabFile(prefabPath);
            if (!prefabContent || !prefabContent.data || !prefabContent.data.length) {
                throw new Error('无法读取预制体文件内容');
            }

            // 找到预制体根节点的fileId (通常是第二个对象，即索引1)
            const rootNode = prefabContent.data.find((item: any) => item.__type === 'cc.Node' && item._parent === null);
            if (!rootNode || !rootNode._prefab) {
                throw new Error('无法找到预制体根节点或其预制体信息');
            }

            // 获取根节点的PrefabInfo
            const rootPrefabInfo = prefabContent.data[rootNode._prefab.__id__];
            if (!rootPrefabInfo || rootPrefabInfo.__type !== 'cc.PrefabInfo') {
                throw new Error('无法找到预制体根节点的PrefabInfo');
            }

            const rootFileId = rootPrefabInfo.fileId;

            // 使用scene API建立预制体连接
            const prefabConnectionData = {
                node: nodeUuid,
                prefab: prefabUuid,
                fileId: rootFileId
            };

            // 尝试使用多种API方法建立预制体连接
            const connectionMethods = [
                () => Editor.Message.request('scene', 'connect-prefab-instance', prefabConnectionData),
                () => Editor.Message.request('scene', 'set-prefab-connection', prefabConnectionData),
                () => Editor.Message.request('scene', 'apply-prefab-link', prefabConnectionData)
            ];

            let connected = false;
            for (const method of connectionMethods) {
                try {
                    await method();
                    connected = true;
                    break;
                } catch (error) {
                    console.warn('预制体连接方法失败，尝试下一个方法:', error);
                }
            }

            if (!connected) {
                // 如果所有API方法都失败，尝试手动修改场景数据
                console.warn('所有预制体连接API都失败，尝试手动建立连接');
                await this.manuallyEstablishPrefabConnection(nodeUuid, prefabUuid, rootFileId);
            }

        } catch (error) {
            console.error('建立预制体连接失败:', error);
            throw error;
        }
    }

    /**
     * 手动建立预制体连接（当API方法失败时的备用方案）
     */
    private async manuallyEstablishPrefabConnection(nodeUuid: string, prefabUuid: string, rootFileId: string): Promise<void> {
        try {
            // 尝试使用dump API修改节点的_prefab属性
            const prefabConnectionData = {
                [nodeUuid]: {
                    '_prefab': {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab',
                        'fileId': rootFileId
                    }
                }
            };

            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path: '_prefab',
                dump: {
                    value: {
                        '__uuid__': prefabUuid,
                        '__expectedType__': 'cc.Prefab'
                    }
                }
            });

        } catch (error) {
            console.error('手动建立预制体连接也失败:', error);
            // 不抛出错误，因为基本的节点创建已经成功
        }
    }

    /**
     * 读取预制体文件内容
     */
    private async readPrefabFile(prefabPath: string): Promise<any> {
        try {
            // 尝试使用asset-db API读取文件内容
            let assetContent: any;
            try {
                assetContent = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
                if (assetContent && assetContent.source) {
                    // 如果有source路径，直接读取文件
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.resolve(assetContent.source);
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    return JSON.parse(fileContent);
                }
            } catch (error) {
                console.warn('使用asset-db读取失败，尝试其他方法:', error);
            }

            // 备用方法：转换db://路径为实际文件路径
            const fsPath = prefabPath.replace('db://assets/', 'assets/').replace('db://assets', 'assets');
            const fs = require('fs');
            const path = require('path');
            
            // 尝试多个可能的项目根路径
            const possiblePaths = [
                path.resolve(process.cwd(), '../../NewProject_3', fsPath),
                path.resolve('/Users/lizhiyong/NewProject_3', fsPath),
                path.resolve(fsPath),
                // 如果是根目录下的文件，也尝试直接路径
                path.resolve('/Users/lizhiyong/NewProject_3/assets', path.basename(fsPath))
            ];

            console.log('尝试读取预制体文件，路径转换:', {
                originalPath: prefabPath,
                fsPath: fsPath,
                possiblePaths: possiblePaths
            });

            for (const fullPath of possiblePaths) {
                try {
                    console.log(`检查路径: ${fullPath}`);
                    if (fs.existsSync(fullPath)) {
                        console.log(`找到文件: ${fullPath}`);
                        const fileContent = fs.readFileSync(fullPath, 'utf8');
                        const parsed = JSON.parse(fileContent);
                        console.log('文件解析成功，数据结构:', {
                            hasData: !!parsed.data,
                            dataLength: parsed.data ? parsed.data.length : 0
                        });
                        return parsed;
                    } else {
                        console.log(`文件不存在: ${fullPath}`);
                    }
                } catch (readError) {
                    console.warn(`读取文件失败 ${fullPath}:`, readError);
                }
            }

            throw new Error('无法找到或读取预制体文件');
        } catch (error) {
            console.error('读取预制体文件失败:', error);
            throw error;
        }
    }

    private async tryCreateNodeWithPrefab(args: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('预制体未找到');
                }

                // 方法2: 使用 create-node 指定预制体资源
                const createNodeOptions: any = {
                    assetUuid: assetInfo.uuid
                };

                // 设置父节点
                if (args.parentUuid) {
                    createNodeOptions.parent = args.parentUuid;
                }

                return Editor.Message.request('scene', 'create-node', createNodeOptions);
            }).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                
                // 如果指定了位置，设置节点位置
                if (args.position && uuid) {
                    Editor.Message.request('scene', 'set-property', {
                        uuid: uuid,
                        path: 'position',
                        dump: { value: args.position }
                    }).then(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                position: args.position,
                                message: '预制体实例化成功（备用方法）并设置了位置'
                            }
                        });
                    }).catch(() => {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: uuid,
                                prefabPath: args.prefabPath,
                                message: '预制体实例化成功（备用方法）但位置设置失败'
                            }
                        });
                    });
                } else {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: uuid,
                            prefabPath: args.prefabPath,
                            message: '预制体实例化成功（备用方法）'
                        }
                    });
                }
            }).catch((err: Error) => {
                resolve({
                    success: false,
                    error: `备用预制体实例化方法也失败: ${err.message}`
                });
            });
        });
    }

    private async tryAlternativeInstantiateMethods(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // 方法1: 尝试使用 create-node 然后设置预制体
                const assetInfo = await this.getAssetInfo(args.prefabPath);
                if (!assetInfo) {
                    resolve({ success: false, error: '无法获取预制体信息' });
                    return;
                }

                // 创建空节点
                const createResult = await this.createNode(args.parentUuid, args.position);
                if (!createResult.success) {
                    resolve(createResult);
                    return;
                }

                // 尝试将预制体应用到节点
                const applyResult = await this.applyPrefabToNode(createResult.data.nodeUuid, assetInfo.uuid);
                if (applyResult.success) {
                    resolve({
                        success: true,
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            name: createResult.data.name,
                            message: '预制体实例化成功（使用备选方法）'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: '无法将预制体应用到节点',
                        data: {
                            nodeUuid: createResult.data.nodeUuid,
                            message: '已创建节点，但无法应用预制体数据'
                        }
                    });
                }

            } catch (error) {
                resolve({ success: false, error: `备选实例化方法失败: ${error}` });
            }
        });
    }

    private async getAssetInfo(prefabPath: string): Promise<any> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                resolve(assetInfo);
            }).catch(() => {
                resolve(null);
            });
        });
    }

    private async createNode(parentUuid?: string, position?: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const createNodeOptions: any = {
                name: 'PrefabInstance'
            };

            // 设置父节点
            if (parentUuid) {
                createNodeOptions.parent = parentUuid;
            }

            // 设置位置
            if (position) {
                createNodeOptions.dump = {
                    position: position
                };
            }

            Editor.Message.request('scene', 'create-node', createNodeOptions).then((nodeUuid: string | string[]) => {
                const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
                resolve({
                    success: true,
                    data: {
                        nodeUuid: uuid,
                        name: 'PrefabInstance'
                    }
                });
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || '创建节点失败' });
            });
        });
    }

    private async applyPrefabToNode(nodeUuid: string, prefabUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // 尝试多种方法来应用预制体数据
            const methods = [
                () => Editor.Message.request('scene', 'apply-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'set-prefab', { node: nodeUuid, prefab: prefabUuid }),
                () => Editor.Message.request('scene', 'load-prefab-to-node', { node: nodeUuid, prefab: prefabUuid })
            ];

            const tryMethod = (index: number) => {
                if (index >= methods.length) {
                    resolve({ success: false, error: '无法应用预制体数据' });
                    return;
                }

                methods[index]().then(() => {
                    resolve({ success: true });
                }).catch(() => {
                    tryMethod(index + 1);
                });
            };

            tryMethod(0);
        });
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        try {
            const nodeUuid = args.nodeUuid;
            if (typeof nodeUuid !== 'string' || nodeUuid.length === 0) {
                return {
                    success: false,
                    code: 'INVALID_SOURCE_NODE',
                    error: 'nodeUuid is required',
                };
            }

            const pathParam = args.prefabPath || args.savePath;
            if (typeof pathParam !== 'string' || pathParam.length === 0) {
                return {
                    success: false,
                    code: 'INVALID_PREFAB_PATH',
                    error: 'prefabPath or savePath is required',
                };
            }

            const prefabName = args.prefabName || 'NewPrefab';
            if (typeof prefabName !== 'string'
                || prefabName.length === 0
                || prefabName.includes('/')
                || prefabName.includes('\\')) {
                return {
                    success: false,
                    code: 'INVALID_PREFAB_NAME',
                    error: 'prefabName must be a non-empty file name',
                };
            }

            const normalizedPath = pathParam.replace(/\/+$/, '');
            const fullPath = normalizedPath.endsWith('.prefab')
                ? normalizedPath
                : `${normalizedPath}/${prefabName}.prefab`;
            if (!fullPath.startsWith('db://assets/')
                || fullPath.includes('/../')
                || fullPath.includes('/./')) {
                return {
                    success: false,
                    code: 'INVALID_PREFAB_PATH',
                    error: `Prefab path must be an explicit db://assets path: ${fullPath}`,
                };
            }

            const sourceNode = await Editor.Message.request(
                'scene',
                'query-node',
                nodeUuid,
            ) as any;
            if (!sourceNode) {
                return {
                    success: false,
                    code: 'SOURCE_NODE_NOT_FOUND',
                    error: `Node with UUID ${nodeUuid} not found`,
                };
            }

            const existingAsset = await Editor.Message.request(
                'asset-db',
                'query-asset-info',
                fullPath,
            ) as any;
            if (existingAsset) {
                return {
                    success: false,
                    code: 'PREFAB_ALREADY_EXISTS',
                    error: `Prefab already exists at ${fullPath}`,
                    data: {
                        prefabPath: fullPath,
                        existingUuid: existingAsset.uuid ?? null,
                    },
                };
            }

            const nativeResult = await Editor.Message.request(
                'scene',
                'execute-scene-script',
                {
                    name: 'cocos-mcp-server',
                    method: 'createPrefabFromNode',
                    args: [nodeUuid, fullPath],
                },
            ) as ToolResponse;
            if (!nativeResult?.success) {
                return nativeResult || {
                    success: false,
                    code: 'PREFAB_CREATE_FAILED',
                    error: 'Creator returned no result while creating the Prefab',
                };
            }

            const prefabUuid = nativeResult.data?.prefabUuid;
            const createdAsset = await Editor.Message.request(
                'asset-db',
                'query-asset-info',
                fullPath,
            ) as any;
            if (typeof prefabUuid !== 'string'
                || !createdAsset
                || createdAsset.type !== 'cc.Prefab'
                || createdAsset.uuid !== prefabUuid) {
                return {
                    success: false,
                    code: 'PREFAB_VERIFICATION_FAILED',
                    error: `Creator created an unverifiable Prefab at ${fullPath}`,
                    data: {
                        expectedUuid: prefabUuid ?? null,
                        actualUuid: createdAsset?.uuid ?? null,
                        actualType: createdAsset?.type ?? null,
                        prefabPath: fullPath,
                    },
                };
            }

            return nativeResult;
        } catch (error: any) {
            return {
                success: false,
                code: 'PREFAB_CREATE_EXCEPTION',
                error: error?.message || String(error),
            };
        }
    }

    private generateUUID(): string {
        // 生成符合Cocos Creator格式的UUID
        const chars = '0123456789abcdef';
        let uuid = '';
        for (let i = 0; i < 32; i++) {
            if (i === 8 || i === 12 || i === 16 || i === 20) {
                uuid += '-';
            }
            uuid += chars[Math.floor(Math.random() * chars.length)];
        }
        return uuid;
    }

    private createMetaData(prefabName: string, prefabUuid: string): any {
        return {
            "ver": "1.1.50",
            "importer": "prefab",
            "imported": true,
            "uuid": prefabUuid,
            "files": [
                ".json"
            ],
            "subMetas": {},
            "userData": {
                "syncNodeName": prefabName
            }
        };
    }

    private async updatePrefab(prefabPath: string, nodeUuid: string): Promise<ToolResponse> {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            const nodeDump = await Editor.Message.request('scene', 'query-node', nodeUuid) as any;
            const prefabDump = nodeDump?.__prefab__;
            const rootUuid = prefabDump?.rootUuid || prefabDump?.value?.rootUuid;
            if (!rootUuid) {
                return {
                    success: false,
                    error: `Node '${nodeUuid}' has no verifiable Prefab root UUID`,
                    data: {
                        prefabState: prefabDump ?? null,
                        nodeDumpKeys: Object.keys(nodeDump || {})
                    }
                };
            }

            const applyResult = await Editor.Message.request('scene', 'apply-prefab', rootUuid);

            return {
                success: true,
                message: 'Prefab updated successfully',
                data: { prefabPath, nodeUuid, rootUuid, applyResult }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async revertPrefab(nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'revert-prefab', {
                node: nodeUuid
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab instance reverted successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getPrefabInfo(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo: any) => {
                const info: PrefabInfo = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async validatePrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                // 读取预制体文件内容
                Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                    if (!assetInfo) {
                        resolve({
                            success: false,
                            error: '预制体文件不存在'
                        });
                        return;
                    }

                    // 验证预制体格式
                    Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                        try {
                            const prefabData = JSON.parse(content);
                            const validationResult = this.validatePrefabFormat(prefabData);
                            
                            resolve({
                                success: true,
                                data: {
                                    isValid: validationResult.isValid,
                                    issues: validationResult.issues,
                                    nodeCount: validationResult.nodeCount,
                                    componentCount: validationResult.componentCount,
                                    message: validationResult.isValid ? '预制体格式有效' : '预制体格式存在问题'
                                }
                            });
                        } catch (parseError) {
                            resolve({
                                success: false,
                                error: '预制体文件格式错误，无法解析JSON'
                            });
                        }
                    }).catch((error: any) => {
                        resolve({
                            success: false,
                            error: `读取预制体文件失败: ${error.message}`
                        });
                    });
                }).catch((error: any) => {
                    resolve({
                        success: false,
                        error: `查询预制体信息失败: ${error.message}`
                    });
                });
            } catch (error) {
                resolve({
                    success: false,
                    error: `验证预制体时发生错误: ${error}`
                });
            }
        });
    }

    private validatePrefabFormat(prefabData: any): { isValid: boolean; issues: string[]; nodeCount: number; componentCount: number } {
        const issues: string[] = [];
        let nodeCount = 0;
        let componentCount = 0;

        // 检查基本结构
        if (!Array.isArray(prefabData)) {
            issues.push('预制体数据必须是数组格式');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        if (prefabData.length === 0) {
            issues.push('预制体数据为空');
            return { isValid: false, issues, nodeCount, componentCount };
        }

        // 检查第一个元素是否为预制体资产
        const firstElement = prefabData[0];
        if (!firstElement || firstElement.__type__ !== 'cc.Prefab') {
            issues.push('第一个元素必须是cc.Prefab类型');
        }

        // 统计节点和组件
        prefabData.forEach((item: any, index: number) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            } else if (item.__type__ && item.__type__.includes('cc.')) {
                componentCount++;
            }
        });

        // 检查必要的字段
        if (nodeCount === 0) {
            issues.push('预制体必须包含至少一个节点');
        }

        return {
            isValid: issues.length === 0,
            issues,
            nodeCount,
            componentCount
        };
    }

    private async duplicatePrefab(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const { sourcePrefabPath, targetPrefabPath, newPrefabName } = args;
                
                // 读取源预制体
                const sourceInfo = await this.getPrefabInfo(sourcePrefabPath);
                if (!sourceInfo.success) {
                    resolve({
                        success: false,
                        error: `无法读取源预制体: ${sourceInfo.error}`
                    });
                    return;
                }

                // 读取源预制体内容
                const sourceContent = await this.readPrefabContent(sourcePrefabPath);
                if (!sourceContent.success) {
                    resolve({
                        success: false,
                        error: `无法读取源预制体内容: ${sourceContent.error}`
                    });
                    return;
                }

                // 生成新的UUID
                const newUuid = this.generateUUID();
                
                // 修改预制体数据
                const modifiedData = this.modifyPrefabForDuplication(sourceContent.data, newPrefabName, newUuid);
                
                // 创建新的meta数据
                const newMetaData = this.createMetaData(newPrefabName || 'DuplicatedPrefab', newUuid);
                
                // 预制体复制功能暂时禁用，因为涉及复杂的序列化格式
                resolve({
                    success: false,
                    error: '预制体复制功能暂时不可用',
                    instruction: '请在 Cocos Creator 编辑器中手动复制预制体：\n1. 在资源管理器中选择要复制的预制体\n2. 右键选择复制\n3. 在目标位置粘贴'
                });

            } catch (error) {
                resolve({
                    success: false,
                    error: `复制预制体时发生错误: ${error}`
                });
            }
        });
    }

    private async readPrefabContent(prefabPath: string): Promise<{ success: boolean; data?: any; error?: string }> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                try {
                    const prefabData = JSON.parse(content);
                    resolve({ success: true, data: prefabData });
                } catch (parseError) {
                    resolve({ success: false, error: '预制体文件格式错误' });
                }
            }).catch((error: any) => {
                resolve({ success: false, error: error.message || '读取预制体文件失败' });
            });
        });
    }

    private modifyPrefabForDuplication(prefabData: any[], newName: string, newUuid: string): any[] {
        // 修改预制体数据以创建副本
        const modifiedData = [...prefabData];
        
        // 修改第一个元素（预制体资产）
        if (modifiedData[0] && modifiedData[0].__type__ === 'cc.Prefab') {
            modifiedData[0]._name = newName || 'DuplicatedPrefab';
        }

        // 更新所有UUID引用（简化版本）
        // 在实际应用中，可能需要更复杂的UUID映射处理
        
        return modifiedData;
    }

    private async restorePrefabNode(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // 使用官方API restore-prefab 还原预制体节点
            (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: '预制体节点还原成功'
                    }
                });
            }).catch((error: any) => {
                resolve({
                    success: false,
                    error: `预制体节点还原失败: ${error.message}`
                });
            });
        });
    }

}
