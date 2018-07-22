/*
 * Copyright (c) 2018 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

// Utility boolean function to determine if input is a number
export function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

export function convertToRenderFormat(reportData) {
    if (!reportData 
        || !reportData.analyzer_result 
        || !reportData.analyzer_result.projects 
        || !reportData.analyzer_result.packages) {
        return {};
    }

    let projects = {},
        declaredLicensesFromAnalyzer = {},
        detectedLicensesFromScanner = {},
        reportDataOpenErrors = {},
        reportDataResolvedErrors = {},
        reportDataLevels = new Set([]),
        reportDataScopes= new Set([]);

    const addErrorsToPackage = (projectIndex, pkgObj, analyzerErrors) => {
        let createErrorObj = (type, error) => {
                return {
                    id: project.id,
                    code: hashCode(project.id) + 'x' + hashCode(pkgObj.id + error),
                    type: type,
                    package: {
                        id: pkgObj.id,
                        path: pkgObj.path,
                        level: pkgObj.level,
                        scope: pkgObj.scope
                    },
                    file: project.definition_file_path,
                    message: error
                };
            },
            errors,
            errorsAnalyzer = [],
            errorsScanner = [],
            packageFromScanner = packagesFromScanner[pkgObj.id] || false,
            project = projects[projectIndex];

        if (analyzerErrors && project) {
            errorsAnalyzer = analyzerErrors.map((error) => {
                return createErrorObj('ANALYZER_PACKAGE_ERROR', error);
            });
        }

        if (packageErrorsFromAnalyzer && project) {
            if (packageErrorsFromAnalyzer[pkgObj.id]) {
                errorsAnalyzer = [...errorsAnalyzer, ...packageErrorsFromAnalyzer[pkgObj.id].map((error) => {
                    return createErrorObj('ANALYZER_PACKAGE_ERROR', error);
                })];
            }
        }

        if (packageFromScanner) {
            errors = packageFromScanner.reduce((accumulator, scanResult) => {
                if (!scanResult.errors) {
                    return accumulator;
                }

                return accumulator.concat(scanResult.errors);
            }, []);

            errorsScanner = errors.map((error) => {
                return createErrorObj('SCANNER_PACKAGE_ERROR', error);
            });
        }

        errors = [...errorsAnalyzer, ...errorsScanner];

        if (errors.length !== 0) {
            pkgObj.errors = errors;

            addErrorsToReportDataReportData(projectIndex, pkgObj.errors);
        }

        return pkgObj;
    },
    addErrorsToReportDataReportData = (projectIndex, errors) => {
        if (Array.isArray(errors) && errors.length !== 0) {
            if (!reportDataOpenErrors.hasOwnProperty(projectIndex)) {
                reportDataOpenErrors[projectIndex] = [];
            }

            reportDataOpenErrors[projectIndex] = [...reportDataOpenErrors[projectIndex], ...errors];
        }
    },
    // Helper function to add license results
    // from Analyzer and Scanner to a package
    addLicensesToPackage = (projectIndex, pkgObj) => {
        let packageFromAnalyzer = packagesFromAnalyzer[pkgObj.id] || false,
            packageFromScanner = packagesFromScanner[pkgObj.id] || false;

        if (pkgObj.id === projects[projectIndex].id) {
            // If package is a project then declared licenses 
            // are not found in packages list coming from Analyzer
            pkgObj.declared_licenses = projects[projectIndex].declared_licenses;
        } else if (packageFromAnalyzer) {
            pkgObj.declared_licenses = packageFromAnalyzer.declared_licenses;
        }

        addPackageLicensesToReportData(
            declaredLicensesFromAnalyzer,
            projectIndex,
            pkgObj,
            pkgObj.declared_licenses
        );

        if (packageFromScanner) {
            pkgObj.results = packageFromScanner;

            pkgObj.license_findings = packageFromScanner.reduce((accumulator, scanResult) => 
                accumulator.concat(scanResult.summary.license_findings), []);

            pkgObj.detected_licenses = removeDuplicatesInArray(pkgObj.license_findings.map(finding => finding.license));

            addPackageLicensesToReportData(
                detectedLicensesFromScanner,
                projectIndex,
                pkgObj,
                pkgObj.detected_licenses
            );
        }

        return pkgObj;
    },
    /* Helper function to add the level and the scope for package 
     * to the project that introduced the dependency.
     *  Needed to visualize or filter a project by
     * package level(s) or scope(s)
     */
    addPackageLevelAndScopeToProject = (projectIndex, level, scope) => {
        let project = projects[projectIndex];

        if (project) {
            if (level && !project.levels.has(level)) {
                project.levels.add(level);
            }
            
            if (scope && scope !== '' && !project.scopes.has(scope)) {
                project.scopes.add(scope);
            }
        }
    },
    /* Helper function to add declared and detected licenses objects
     * to the report data object
     * 
     * Example of object this function creates:
     * 
     * declared_licenses['./java/lite/pom.xml']: {
     *    'Eclipse Public License 1.0': {
     *        id: 'Maven:com.google.protobuf:protobuf-lite:3.0.0', 
     *        definition_file_path: './java/lite/pom.xml',
     *        package: {
     *            id: 'Maven:junit:junit:4.12'
     *        }
     *    }
     * }
     */
    addPackageLicensesToReportData = (reportDataLicenses, projectIndex, pkgObj, licenses) => {
       if (Array.isArray(licenses)) {
           for (let i = licenses.length - 1; i >= 0; i--) {
               let license = licenses[i],
                   project = projects[projectIndex],
                   licenseOccurance = [],
                   licenseOccurances;

               if (!reportDataLicenses.hasOwnProperty(projectIndex)) {
                   reportDataLicenses[projectIndex] = {};
               }

               if (!reportDataLicenses[projectIndex].hasOwnProperty(license)) {
                   reportDataLicenses[projectIndex][license] = new Map();
               }

               if (project && project.id && pkgObj && pkgObj.id) {
                   licenseOccurances = reportDataLicenses[projectIndex][license];

                   if (licenseOccurances.has(pkgObj.id)) {
                       licenseOccurance = licenseOccurances.get(pkgObj.id);
                   }

                   reportDataLicenses[projectIndex][license].set(
                       pkgObj.id,
                       [
                           ...licenseOccurance,
                           {
                               id: project.id,
                               definition_file_path: project.definition_file_path,
                               package: {
                                   id: pkgObj.id,
                                   level: pkgObj.level,
                                   path: pkgObj.path,
                                   scope: pkgObj.scope
                               },
                               type: 'PACKAGE'
                           }
                       ]
                   );
               }
           }
       }
    },
    /* Helper function is called by recursivePackageAnalyzer
     * for each package. Designed to flatten tree of dependencies 
     * into a single object so tree can be rendered as a table
     */
    addPackageToProjectList = (projectIndex, pkgObj) => {
        let projectsListPkg;

        projectsListPkg = projects[projectIndex].packages.list[pkgObj.id];

        if (!projectsListPkg) {
            pkgObj.levels = [pkgObj.level];
            pkgObj.paths = [];
            pkgObj.scopes = [pkgObj.scope];
            
            projects[projectIndex].packages.list[pkgObj.id] = projectsListPkg = pkgObj;
            projects[projectIndex].packages.total = ++projects[projectIndex].packages.total;
        } else {
            // Ensure each level only occurs once
            if (!projectsListPkg.levels.includes(pkgObj.level)) {
                projectsListPkg.levels.push(pkgObj.level);
            }

            // Ensure each scope only occurs once
            if (!projectsListPkg.scopes.includes(pkgObj.scope)) {
                projectsListPkg.scopes.push(pkgObj.scope);
            }
        }

        if (pkgObj.scope !== '' && pkgObj.path.length !== 0) {
            projectsListPkg.paths.push({
                scope: pkgObj.scope,
                path: pkgObj.path
            });
        }
        
        addPackageLevelAndScopeToProject(projectIndex, pkgObj.level, pkgObj.scope);

        delete pkgObj.children;
        delete pkgObj.path;
        delete pkgObj.level;
        delete pkgObj.scope;

        return pkgObj;
    },
    addProjectLevelsToReportDataReportData = (projectIndex) => {
        let project = projects[projectIndex];
        
        if (project && project.levels && project.levels.size !== 0) {
            reportDataLevels = new Set([...reportDataLevels, ...project.levels]);
        }
    },
    addProjectLicensesToReportData = (projectIndex) => {
        let addLicensesToReportData = (licenses, projectIndex, project, projectLicenses) => {
            if (Array.isArray(projectLicenses)) {
                for (let i = projectLicenses.length - 1; i >= 0; i--) {
                    let license = projectLicenses[i],
                    project = projects[projectIndex],
                    licenseOccurance = [],
                    licenseOccurances;

                    if (!licenses.hasOwnProperty(projectIndex)) {
                        licenses[projectIndex] = {};
                    }

                    if (!licenses[projectIndex].hasOwnProperty(license)) {
                        licenses[projectIndex][license] = new Map();
                    }

                    if (project && project.id) {
                        licenseOccurances = licenses[projectIndex][license];

                        
                        if (licenseOccurances.has(project.id)) {
                            licenseOccurance = licenseOccurances.get(project.id);
                        }

                        licenses[projectIndex][license].set(
                            project.id,
                            [
                                ...licenseOccurance,
                                {
                                    id: project.id,
                                    definition_file_path: project.definition_file_path,
                                    type: 'PROJECT'
                                }
                            ]
                        );
                    }
                }
            }
        },
        project = projects[projectIndex];

        if (project) {
            addLicensesToReportData(declaredLicensesFromAnalyzer, projectIndex, project, project.declared_licenses);
            addLicensesToReportData(detectedLicensesFromScanner, projectIndex, project, project.detected_licenses);
        }
    },
    addProjectScopesToReportDataReportData = (projectIndex) => {
        let project = projects[projectIndex];
        
        if (project && project.scopes && project.scopes.size !== 0) {
            reportDataScopes= new Set([...reportDataScopes, ...project.scopes]);
        }
    },
    // Helper function to add results from Scanner to a project
    addScanResultsToProject = (project) => {
        let projectId = project.id,
            projectFromScanner = packagesFromScanner[projectId] || false;

        if (projectId && projectFromScanner) {
            project.results = projectFromScanner;

            project.license_findings = projectFromScanner.reduce((accumulator, scanResult) => 
                accumulator.concat(scanResult.summary.license_findings), []);

            project.detected_licenses = removeDuplicatesInArray(project.license_findings.map(finding => finding.license));
        }

        return project;
    },
    calculateNrPackagesLicenses = (projectsLicenses) => {
        return Object.values(projectsLicenses).reduce((accumulator, projectLicenses) => {
            for (let license in projectLicenses) {
                let licenseMap = projectLicenses[license];

                if (!accumulator.hasOwnProperty(license)) {
                    accumulator[license] = 0; 
                }

                accumulator[license] = accumulator[license] + licenseMap.size;
            }
            return accumulator;
        }, {});
    },
    calculateReportDataTotalLicenses = (projectsLicenses) => {
        let licensesSet = new Set([]); 
        
        return Object.values(projectsLicenses).reduce((accumulator, projectLicenses) => {
            for (let license in projectLicenses) {
                accumulator.add(license);
            }
            return accumulator;
        }, licensesSet).size || undefined;
    },
    calculateReportDataTotalErrors = () => {
        let errorsArr,
            reportDataTotalErrors;

        if (reportDataOpenErrors.length !== 0) {
            reportDataTotalErrors = 0;
            errorsArr = Object.values(reportDataOpenErrors);

            for (let i = errorsArr.length - 1; i >= 0 ; i--) {
                reportDataTotalErrors = reportDataTotalErrors + errorsArr[i].length;
            }

            return reportDataTotalErrors;
        }

        return undefined;
    },
    calculateReportDataTotalLevels = () => {
        if (reportDataLevels && reportDataLevels.size) {
            return reportDataLevels.size;
        }

        return undefined;
    },
    calculateReportDataTotalPackages = () => {
        if (packagesFromAnalyzer) {
            return Object.keys(packagesFromAnalyzer).length;
        }

        return undefined;
    },
    calculatReportDataTotalProjects = () => {
        return Object.keys(projects).length;
    },
    calculateReportDataTotalScopes = () => {
        if (reportDataScopes&& reportDataScopes.size) {
            return reportDataScopes.size;
        }

        return undefined;
    },
    // Using ES6 Proxy extend pkgObj with info from Analyzer's packages
    packageProxyHandler = {
        get: (pkgObj, prop) => {
            let packageFromAnalyzer = packagesFromAnalyzer[pkgObj.id];

            if (pkgObj.hasOwnProperty(prop)) {
                return pkgObj[prop];
            }

            if (packageFromAnalyzer) {
                if (packageFromAnalyzer.hasOwnProperty(prop)) {
                    return packageFromAnalyzer[prop];
                }
            }
        }
    },
    // Transform Analyer results to be indexed by package Id for faster lookups
    packagesFromAnalyzer = ((dataArr) => {
        let tmp = {};

        for (let i = dataArr.length - 1; i >= 0; i--) {
            tmp[dataArr[i].package.id] = {
                ...dataArr[i].package,
                curations: dataArr[i].curations
            }
        }

        return tmp;
    })(reportData.analyzer_result.packages || []),
    // Transform Scanner results to be indexed by package Id for faster lookups
    packagesFromScanner = ((dataArr) => {
        let tmp = {};

        for (let i = dataArr.length - 1; i >= 0; i--) {
            tmp[dataArr[i].id] = dataArr[i].results;
        }

        return tmp;
    })(reportData.scan_results || []),
    packageErrorsFromAnalyzer = reportData.analyzer_result.errors,
    projectsFromAnalyzer = reportData.analyzer_result.projects,
    /* Helper function to recursive traverse over the packages
     * found by the Analyzer so they can be transformed
     * into a format that suitable for use in the WebApp
     */
    recursivePackageAnalyzer = (projectIndex, pkg, dependencyPathFromRoot = [], scp = '', delivered) => {
        const children = Object.entries(pkg).reduce((accumulator, [key, value]) => {
            // Only recursively traverse objects which can hold packages
            if (key === 'dependencies') {
                const depsChildren = value.map((dep) => recursivePackageAnalyzer(projectIndex, dep, [...dependencyPathFromRoot, pkg.id || pkg.name], scp, delivered));
                accumulator.push(...depsChildren);
            }

            if (key === 'scopes') {
                const scopeChildren = value.map((scope) => {
                    return scope.dependencies.map((dep) => recursivePackageAnalyzer(projectIndex, dep, [...dependencyPathFromRoot, pkg.name || pkg.id], scope.name, scope.delivered));
                })
                // Remove empty arrays resulting from scopes without dependencies
                .reduce((accumulator, scopeDeps) => [...accumulator, ...scopeDeps], []);
                accumulator.push(...scopeChildren);
            }

            return accumulator;
        }, []),
        pkgObj = new Proxy((() => {
            let obj = {
                id: pkg.id || pkg.name,
                children,
                errors: pkg.errors || [],
                level: dependencyPathFromRoot.length,
                path: dependencyPathFromRoot,
                scope: scp
            };

            obj = addLicensesToPackage(projectIndex, obj);

            if (delivered) {
                obj.delivered = delivered;
            }

            obj = addErrorsToPackage(projectIndex, obj, pkg.errors || []);

            return obj;
        })(), packageProxyHandler);

        addPackageToProjectList(projectIndex, pkgObj);

        return pkgObj;
    }

    // Traverse over projects
    for (let i = projectsFromAnalyzer.length - 1; i >= 0 ; i--) {
        let project = projectsFromAnalyzer[i],
            projectIndex = [i],
            projectFile = project.definition_file_path;

        // Add ./ so we never have empty string
        projectFile = project.definition_file_path = './' + projectFile;

        if (!projects[projectIndex]) {
            projects[projectIndex] = addScanResultsToProject({ 
                id: project.id,
                index: i,
                declared_licenses: project.declared_licenses || [],
                definition_file_path: project.definition_file_path,
                homepage_url: project.homepage_url,
                levels: new Set([]),
                packages: {
                    list: {},
                    total: 0,
                    tree: []
                },
                scopes: new Set([]),
                vcs: project.vcs,
                vcs_processed: project.vcs_processed
            });
        }

        projects[projectIndex].packages.tree = recursivePackageAnalyzer(projectIndex, project);

        addProjectLicensesToReportData(projectIndex);
        addProjectLevelsToReportDataReportData(projectIndex);
        addProjectScopesToReportDataReportData(projectIndex);

        // As packages are added recursively to get an array
        // with the right order we need to reverse it
        projects[projectIndex].packages.list = Object.values(projects[projectIndex].packages.list).reverse();
    }

    window.reportData = {
        hasErrors: reportData.has_errors || false,
        errors: {
            data: {
                open: reportDataOpenErrors,
                resolved: reportDataResolvedErrors,
            },
            total: {
                open: calculateReportDataTotalErrors(),
                resolved: 0,
            },
        },
        levels: {
            data: reportDataLevels,
            total: calculateReportDataTotalLevels()
        },
        licenses: {
            data: {
                declared: calculateNrPackagesLicenses(declaredLicensesFromAnalyzer),
                detected: calculateNrPackagesLicenses(detectedLicensesFromScanner)
            },
            total: {
                declared: calculateReportDataTotalLicenses(declaredLicensesFromAnalyzer),
                detected: calculateReportDataTotalLicenses(detectedLicensesFromScanner)
            }
        },
        packages: {
            data: {
                analyzer: packagesFromAnalyzer || {},
                scanner:  packagesFromScanner || {}
            },
            total: calculateReportDataTotalPackages()
        },
        projects: {
            data: projects,
            total: calculatReportDataTotalProjects()
        },
        scopes: {
            data: reportDataScopes,
            total: calculateReportDataTotalScopes()
        },
        vcs: reportData.analyzer_result.vcs || {},
        vcs_processed: reportData.analyzer_result.vcs_processed || {},
    };

    return window.reportData;
}

// Utility function to remove duplicates from Array
// https://codehandbook.org/how-to-remove-duplicates-from-javascript-array/
export function removeDuplicatesInArray(arr) {
    return Array.from(new Set(arr));
}

// SPDX-License-Identifier: MIT
// Author KimKha
// https://stackoverflow.com/questions/194846/is-there-any-kind-of-hash-code-function-in-javascript#8076436
export function hashCode(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        let character = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        // Convert to 32bit integer
        hash = hash & hash; 
    }
    return hash;
}

// Computes the sha256 of a string and display its hex digest.
// Based example on https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
// Any copyright is dedicated to the Public Domain
// SPDX-License-Identifier: CC0-1.0
export function sha256(str) {
    // Transform the string into an arraybuffer.
    var buffer = new TextEncoder("utf-8").encode(str),
        hex = (buffer) => {
            let hexCodes = [],
                view = new DataView(buffer);

            for (let i = 0; i < view.byteLength; i += 4) {
                // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
                let value = view.getUint32(i),
                    // toString(16) will give the hex representation of the number without padding
                    stringValue = value.toString(16),
                    // Concatenation and slice for padding
                    padding = '00000000',
                    paddedValue = (padding + stringValue).slice(-padding.length);

                hexCodes.push(paddedValue);
            }

          // Join all the hex strings into one
          return hexCodes.join("");
        };

    return crypto.subtle.digest("SHA-256", buffer).then((hash) => {
        return hex(hash);
    });
}