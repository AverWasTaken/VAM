"use strict";

/**
 * Views Asset Manager - Folder Controller
 * Handles folder operations: loading, path building, and selection.
 */
(function(global) {
    global.Views = global.Views || {};

    const Utils = global.Views.Utils;
    const API = global.Views.API;
    const UI = global.Views.UI;
    const State = global.Views.State;

    const log = Utils.log;

    /**
     * Loads PNG folders from API and builds lookup map.
     * Uses preloaded data if available.
     * @returns {Promise<Array>} Array of folder objects
     */
    const loadFolders = async () => {
        const state = State.getState();
        let folders;

        if (state.preloadFoldersPromise) {
            log("Using preloaded folders...");
            folders = await state.preloadFoldersPromise;
            state.preloadFoldersPromise = null;

            if (!folders) {
                log("Preloaded folders unavailable, fetching fresh...");
                folders = await API.fetchFolders();
            }
        } else {
            folders = await API.fetchFolders();
        }

        state.folders = folders;

        state.folderMap = {};
        folders.forEach(folder => {
            state.folderMap[folder.id] = folder;
        });

        log(`Loaded ${folders.length} PNG folders into state.`);
        return folders;
    };

    /**
     * Loads AI folders from API and builds lookup map.
     * Uses preloaded data if available.
     * @returns {Promise<Array>} Array of AI folder objects
     */
    const loadAIFolders = async () => {
        const state = State.getState();
        let folders;

        if (state.preloadAIFoldersPromise) {
            log("Using preloaded AI folders...");
            folders = await state.preloadAIFoldersPromise;
            state.preloadAIFoldersPromise = null;

            if (!folders) {
                log("Preloaded AI folders unavailable, fetching fresh...");
                folders = await API.fetchAIFolders();
            }
        } else {
            folders = await API.fetchAIFolders();
        }

        state.aiFolders = folders || [];
        state.aiFoldersSynced = true;

        state.aiFolderMap = {};
        state.aiFolders.forEach(folder => {
            state.aiFolderMap[folder.id] = folder;
        });

        log(`Loaded ${state.aiFolders.length} AI folders into state.`);
        return state.aiFolders;
    };

    /**
     * Builds folder path from local PNG folder data
     * @param {string} folderId - Target folder ID
     * @returns {Array} Array of folder objects from root to target
     */
    const buildFolderPath = (folderId) => {
        const state = State.getState();
        const path = [];
        let currentId = folderId;

        while (currentId && state.folderMap[currentId]) {
            const folder = state.folderMap[currentId];
            path.unshift(folder);
            currentId = folder.parentId;
        }

        return path;
    };

    /**
     * Builds folder path from local AI folder data
     * @param {string} folderId - Target AI folder ID
     * @returns {Array} Array of AI folder objects from root to target
     */
    const buildAIFolderPath = (folderId) => {
        const state = State.getState();
        const path = [];
        let currentId = folderId;

        while (currentId && state.aiFolderMap[currentId]) {
            const folder = state.aiFolderMap[currentId];
            path.unshift(folder);
            currentId = folder.parentId;
        }

        return path;
    };

    /**
     * Selects a PNG folder and triggers asset view update
     * @param {string} folderId - Folder ID to select ("all", "favorites", or folder UUID)
     * @param {Object} callbacks - Event callbacks for asset rendering
     * @param {Function} updateAssetViewFn - Function to update asset view
     */
    const selectFolder = async (folderId, callbacks, updateAssetViewFn) => {
        const state = State.getState();
        const Preferences = global.Views.Preferences;
        const targetId = String(folderId);

        if (String(state.selectedFolderId) === targetId && !state.isWelcome) return;

        state.selectedFolderId = targetId;
        state.isWelcome = false;

        UI.elements.folderList.querySelectorAll(".folder-item").forEach((item) => {
            item.classList.toggle("folder-item--active", item.dataset.folderId === targetId);
        });

        log(`Selected PNG folder: ${targetId}`);

        // Save last folder preference
        if (Preferences) {
            Preferences.setLastFolder(targetId);
        }

        State.resetPagination();
        state.searchQuery = "";
        UI.clearSearch();

        if (targetId === "all" || targetId === "favorites") {
            state.currentFolderPath = [];
            UI.hideBreadcrumbs();
        } else {
            state.currentFolderPath = buildFolderPath(targetId);
            UI.renderBreadcrumbs(state.currentFolderPath, (id) => selectFolder(id, callbacks, updateAssetViewFn));

            const pathIds = state.currentFolderPath.slice(0, -1).map(f => f.id);
            UI.expandToFolder(targetId, pathIds);
        }

        updateAssetViewFn(callbacks);
    };

    /**
     * Selects an AI folder and triggers AI asset view update
     * @param {string} folderId - AI Folder ID to select ("all", "favorites", or folder UUID)
     * @param {Object} callbacks - Event callbacks for AI asset rendering
     * @param {Function} updateAIAssetViewFn - Function to update AI asset view
     */
    const selectAIFolder = async (folderId, callbacks, updateAIAssetViewFn) => {
        const state = State.getState();
        const Preferences = global.Views.Preferences;
        const targetId = String(folderId);

        if (String(state.selectedFolderId) === targetId && !state.isWelcome) return;

        state.selectedFolderId = targetId;
        state.isWelcome = false;

        UI.elements.folderList.querySelectorAll(".folder-item").forEach((item) => {
            item.classList.toggle("folder-item--active", item.dataset.folderId === targetId);
        });

        log(`Selected AI folder: ${targetId}`);

        // Save last AI folder preference
        if (Preferences) {
            Preferences.setLastAIFolder(targetId);
        }

        State.resetPagination();
        state.aiVisibleCount = 20;
        state.searchQuery = "";
        UI.clearSearch();

        if (targetId === "all" || targetId === "favorites") {
            state.currentFolderPath = [];
            UI.hideBreadcrumbs();
        } else {
            state.currentFolderPath = buildAIFolderPath(targetId);
            UI.renderBreadcrumbs(state.currentFolderPath, (id) => selectAIFolder(id, callbacks, updateAIAssetViewFn));

            const pathIds = state.currentFolderPath.slice(0, -1).map(f => f.id);
            UI.expandToFolder(targetId, pathIds);
        }

        updateAIAssetViewFn(callbacks);
    };

    global.Views.FolderController = {
        loadFolders,
        loadAIFolders,
        buildFolderPath,
        buildAIFolderPath,
        selectFolder,
        selectAIFolder
    };

})(window);

