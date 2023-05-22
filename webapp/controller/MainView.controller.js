sap.ui.define(["sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"sap/m/ViewSettingsFilterItem",
	"sap/m/ViewSettingsItem",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter"
], function (BaseController, Fragment, ViewSettingsFilterItem, ViewSettingsItem, Filter, Sorter) {
	"use strict";

	return BaseController.extend("com.sap.build.standard.filtertable.controller.MainView", {

		handleRouteMatched: function (oEvent) {
			var sAppId = "App6409917dde4cd20167ed213e";

			var oParams = {};

			if (oEvent.mParameters.data.context) {
				this.sContext = oEvent.mParameters.data.context;

			} else {
				if (this.getOwnerComponent().getComponentData()) {
					var patternConvert = function (oParam) {
						if (Object.keys(oParam).length !== 0) {
							for (var prop in oParam) {
								if (prop !== "sourcePrototype" && prop.includes("Set")) {
									return prop + "(" + oParam[prop][0] + ")";
								}
							}
						}
					};

					this.sContext = patternConvert(this.getOwnerComponent().getComponentData().startupParameters);

				}
			}

			var oPath;

			if (this.sContext) {
				oPath = {
					path: "/" + this.sContext,
					parameters: oParams
				};
				this.getView().bindObject(oPath);
			}

		},
		doNavigate: function (sRouteName, oBindingContext, fnPromiseResolve, sViaRelation) {
			var sPath = (oBindingContext) ? oBindingContext.getPath() : null;
			var oModel = (oBindingContext) ? oBindingContext.getModel() : null;

			var sEntityNameSet;
			if (sPath !== null && sPath !== "") {
				if (sPath.substring(0, 1) === "/") {
					sPath = sPath.substring(1);
				}
				sEntityNameSet = sPath.split("(")[0];
			}
			var sNavigationPropertyName;
			var sMasterContext = this.sMasterContext ? this.sMasterContext : sPath;

			if (sEntityNameSet !== null) {
				sNavigationPropertyName = sViaRelation || this.getOwnerComponent().getNavigationPropertyForNavigationWithContext(sEntityNameSet, sRouteName);
			}
			if (sNavigationPropertyName !== null && sNavigationPropertyName !== undefined) {
				if (sNavigationPropertyName === "") {
					this.oRouter.navTo(sRouteName, {
						context: sPath,
						masterContext: sMasterContext
					}, false);
				} else {
					oModel.createBindingContext(sNavigationPropertyName, oBindingContext, null, function (bindingContext) {
						if (bindingContext) {
							sPath = bindingContext.getPath();
							if (sPath.substring(0, 1) === "/") {
								sPath = sPath.substring(1);
							}
						} else {
							sPath = "undefined";
						}

						// If the navigation is a 1-n, sPath would be "undefined" as this is not supported in Build
						if (sPath === "undefined") {
							this.oRouter.navTo(sRouteName);
						} else {
							this.oRouter.navTo(sRouteName, {
								context: sPath,
								masterContext: sMasterContext
							}, false);
						}
					}.bind(this));
				}
			} else {
				this.oRouter.navTo(sRouteName);
			}

			if (typeof fnPromiseResolve === "function") {
				fnPromiseResolve();
			}

		},
		onInit: function () {
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("MainView").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
			this._mDialogs = {};
			this._oView = this.getView();
			this._oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		//*** View Settings Section (Sort, filter, group) ***/

		// Opens View Settings Dialog on Filter page
		handleOpenDialogSort: function () {
			this._openDialog("MainFilter", "sort", this._presetSettingsItems);
		},
		// Opens View Settings Dialog on Filter page
		handleOpenDialogFilter: function () {
			this._openDialog("MainFilter", "filter", this._presetSettingsItems);
		},

		// Opens View Settings Dialog on Filter page
		handleOpenDialogGroup: function () {
			this._openDialog("MainFilter", "group", this._presetSettingsItems);
		},

		// View Setting Dialog opener
		_openDialog: function (sName, sPage, fInit) {
			var oView = this.getView();
			var oThis = this;

			// creates requested dialog if not yet created
			if (!this._mDialogs[sName]) {
				this._mDialogs[sName] = Fragment.load({
					id: oView.getId(),
					name: "com.sap.build.standard.filtertable.view." + sName,
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					if (fInit) {
						fInit(oDialog, oThis);
					}
					return oDialog;
				});
			}
			this._mDialogs[sName].then(function (oDialog) {
				// opens the requested dialog
				oDialog.open(sPage);
				//fInit(oDialog, oThis);
			});
		},
		_presetSettingsItems: function (oDialog, oThis) {
			oThis._presetFiltersInit(oDialog, oThis);
			oThis._presetSortsInit(oDialog, oThis);
			oThis._presetGroupsInit(oDialog, oThis);
		},
		_presetSortsInit: function (oDialog, oThis) {
			let oDialogParent = oDialog.getParent(),
				oTable = oDialogParent.byId("supplierTable"),
				oColumns = oTable.getColumns();
			// Loop every column of the table
			oColumns.forEach(column => {
				let columnId = column.getId().split("--")[2]; // Get column ID (JSON Property)
				oDialog.addSortItem(new ViewSettingsItem({ // Convert column ID into ViewSettingsItem objects.
					key: columnId, // Key -> JSON Property
					text: column.getAggregation("header").getProperty("text"),
				}));
			})
		},
		// adds presetFilters to the View Settings Dialog
		_presetFiltersInit: function (oDialog, oThis) {
			let oDialogParent = oDialog.getParent(),
				oModelData = oDialogParent.getController().getOwnerComponent().getModel("suppliersModel").getData(),
				oTable = oDialogParent.byId("supplierTable"),
				oColumns = oTable.getColumns();
			// Loop every column of the table
			oColumns.forEach(column => {
				let columnId = column.getId().split("--")[2], // Get column ID (JSON Property)
					oColumnItems = oModelData.d.results.map(oItem => oItem[columnId]), // Use column ID as JSON property (Here's the magic !)
					oUniqueItems = oColumnItems.filter((value, index, array) => array.indexOf(value) === index), // Get all unique values for this column
					oUniqueFilterItems = oUniqueItems.map(oItem => new ViewSettingsItem({ // Convert unique values into ViewSettingsItem objects.
						text: oItem,
						key: columnId + "___" + "EQ___" + oItem // JSON property = Unique value
					}));

				// Set this values as selectable on the filter list
				oDialog.addFilterItem(new ViewSettingsFilterItem({
					key: columnId, // ID of the column && JSON property
					text: column.getAggregation("header").getProperty("text"), // Filter Name -> Column Text
					items: oUniqueFilterItems // Set of possible values of the filter
				}));
			})
		},
		// adds presetGroups to the View Settings Dialog
		_presetGroupsInit: function (oDialog, oThis) {
			let oDialogParent = oDialog.getParent(),
				oTable = oDialogParent.byId("supplierTable"),
				oColumns = oTable.getColumns();

			this.mGroupFunctions = {};
			// Loop every column of the table
			oColumns.forEach(column => {
				let columnId = column.getId().split("--")[2]; // Get column ID (JSON Property)
				oDialog.addGroupItem(new ViewSettingsItem({ // Convert column ID into ViewSettingsItem objects.
					key: columnId, // ID of the column && JSON property
					text: column.getAggregation("header").getProperty("text"), // Filter Name -> Column Text
				}));
				// Set group functions
				let groupFn = function (oContext) {
					var name = oContext.getProperty(columnId);
					return {
						key: name, // ID of the column && JSON property
						text: name // Filter Name -> Column Text
					};
				}
				this.mGroupFunctions[columnId] = {};
				this.mGroupFunctions[columnId] = groupFn;
			});
		},
		handleConfirm: function (oEvent) {
			let oTable = this.byId("supplierTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				aFilters = [],
				sPath,
				bDescending,
				aSorters = [],
				vGroup,
				aGroups = [];

			// Filtering
			if (mParams.filterItems) {
				mParams.filterItems.forEach(function (oItem) {
					let aSplit = oItem.getKey().split("___"),
						sPath = aSplit[0],
						sOperator = aSplit[1],
						sValue1 = aSplit[2],
						sValue2 = aSplit[3],
						oFilter = new Filter(sPath, sOperator, sValue1, sValue2);
					aFilters.push(oFilter);
				});
				// apply filter settings
				oBinding.filter(aFilters);
				// update filter bar
				this.byId("suppliersFilterBar").setVisible(aFilters.length > 0);
				this.byId("suppliersFilterLabel").setText(mParams.filterString);
			}
			// Sorting
			if (mParams.sortItem) {
				sPath = mParams.sortItem.getKey();
				bDescending = mParams.sortDescending;
				aSorters.push(new Sorter(sPath, bDescending));

				// apply the selected sort and group settings
				oBinding.sort(aSorters);
			}
			// Grouping
			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				vGroup = this.mGroupFunctions[sPath];
				aGroups.push(new Sorter(sPath, bDescending, vGroup));
				// apply the selected group settings
				oBinding.sort(aGroups);
			} else if (this.groupReset) {
				oBinding.sort();
				this.groupReset = false;
			}
		}
	});
}, /* bExport= */ true);
