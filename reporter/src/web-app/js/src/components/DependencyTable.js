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

import React from 'react';
import { Alert, List, Steps, Table, Tag } from 'antd';
import 'antd/dist/antd.css';
import { removeDuplicatesInArray } from '../utils';
import { LicenseTag } from './LicenseTag';

const Step = Steps.Step;

export class DependencyTable extends React.Component {
    constructor(props) {
        super(props);

        if (props.project) {
            this.state = {
                ...this.state,
                data: props.project
            };
            
            // Specifies table columns as per
            // https://ant.design/components/table/
            this.columns = [
                {
                    align: 'left',
                    dataIndex: 'id', 
                    key: 'id',
                    //onFilter: (value, record) => record.id.indexOf(value) === 0,
                    sorter: (a, b) => a.id.length - b.id.length,
                    title: 'Id',
                    render: (text, row, index) => {
                        return <span className="ort-package-id">{text}</span>;
                    }
                },
                {
                    align: 'left',
                    dataIndex: 'scopes',
                    filters: (() => {
                        return Array.from(this.state.data.scopes).sort().map(scope => {
                            return {
                                text: scope,
                                value: scope
                            };
                        });
                    })(),
                    key: 'scopes',
                    onFilter: (scope, component) => component.scopes.includes(scope),
                    title: 'Scopes',
                    render: (text, row, index) => {
                        return (
                            <ul className="ort-table-list">
                                {row.scopes.map(scope => <li key={scope}>{scope}</li>)}
                            </ul>
                        );
                    }
                },
                {
                    align: 'left',
                    dataIndex: 'levels',
                    filters: (() => {
                        return Array.from(this.state.data.levels).sort().map(level => {
                            return {
                                text: level,
                                value: level
                            };
                        });
                    })(),
                    filterMultiple: true,
                    key: 'levels',
                    //onFilter: (level, component) => component.levels.includes(parseInt(level, 10)),
                    render: (text, row, index) => {
                        return (
                            <ul className="ort-table-list">
                                {row.levels.map(level => <li key={level}>{level}</li>)}
                            </ul>
                        );
                    },
                    title: 'Levels',
                    width: 80
                },
                {
                    align: 'left',
                    dataIndex: 'declared_licenses',
                    filters: (() => {
                        return this.state.data.declared_licenses.sort().map(license => {
                            return {
                                text: license,
                                value: license
                            };
                        });
                    })(),
                    filterMultiple: true,
                    key: 'declared_licenses',
                    onFilter: (value, record) => record.declared_licenses.includes(value),
                    title: 'Declared Licenses',
                    render: (text, row, index) => {
                        if (row.declared_licenses) {
                            return (
                                <ul className="ort-table-list">
                                    {row.declared_licenses.map(license => <li key={license}><LicenseTag text={license}/></li>)}
                                </ul>
                            );
                        } else {
                            console.log("row", row);
                        }
                    },
                    width: 160
                },
                {
                    align: 'left',
                    dataIndex: 'detected_licenses',
                    filters: (() => {
                        return this.state.data.detected_licenses.sort().map(license => {
                            return {
                                text: license,
                                value: license
                            };
                        });
                    })(),
                    filterMultiple: true,
                    key: 'detected_licenses',
                    onFilter: (license, component) => component.detected_licenses.includes(license),
                    title: 'Detected Licenses',
                    render: (text, row, index) => {
                        return (
                            <ul className="ort-table-list">
                                {row.detected_licenses.map(license => <li key={license}><LicenseTag text={license}/></li>)}
                            </ul>
                        );
                    },
                    width: 160
                },
                {
                    align: 'left',
                    filters: (function () { 
                        return [ 
                            { 'text': 'Errors', 'value': 'errors'},
                            { 'text': 'OK', 'value': 'ok'},
                            { 'text': 'Updates', 'value': 'updates'},
                            { 'text': 'Warnings', 'value': 'warnings'}
                        ]; 
                    })(),
                    filterMultiple: true,
                    key: 'status',
                    onFilter: (status, component) => {
                        if (status === 'ok') {
                            component.errors.length === 0 ? true : false;
                        }
                        
                        if (status === 'errors') {
                            component.errors.length !== 0 ? true : false;
                        }

                        return false;
                    },
                    render: (text, row, index) => {
                        let nrErrorsText = (errors) => {
                            return errors.length + ' error' + ((errors.length > 1) ? 's' : '');
                        };
                        
                        if (Array.isArray(row.errors) && row.errors.length > 0) {
                            return <Tag className="ort-status-error" color="red">{nrErrorsText(row.errors)}</Tag>;
                        }

                        return <Tag className="ort-status-ok" color="blue">OK</Tag>
                    },
                    title: 'Status',
                    width: 80
                }
            ];
        }
        console.log("this.state", this.state)
    }

    render() {
        const { data } = this.state;

        return (
            <Table
                columns={this.columns}
                expandedRowRender={record => {
                    return (
                        <div>
                            <PackageExpandedRowInfo data={record}/>
                        </div>
                    );
                }}
                dataSource={data.packages.list}
                pagination={false}
                size='small'
                rowKey='id'/>
        );
    }
}

// Generates the HTML for the additional package information in an expanded row of projectTable
const PackageExpandedRowInfo = (props) => {
    if (props.data) {
        console.log("props expanded", props);
            const pkgObj = props.data;
        
            console.log("pkgObj", pkgObj.description);

        return (
            <table>
                <tbody>
                    <tr>
                        <td>Name</td><td>Value</td>
                    </tr>
                </tbody>
            </table>
        );
    }
    return (<span>No additional data available for this package</span>);
}

/*
        const data = props.data,
              packages = data.projects[props.project],
              packagesDeclaredLicenses = removeDuplicatesInArray(Object.keys(data.declaredLicenses[props.project])),
              packagesDeclaredLicensesFilter = [],
              packagesDetectedLicenses = removeDuplicatesInArray(Object.keys(data.detectedLicenses[props.project])),
              packagesDetectedLicensesFilter = [],
              packagesLevels = data.levels[props.project],
              packagesLevelsFilter = [],
              statusFilter = [];

            this.packages = packages;

        // Do not display any table column filters if table is small
        if (packages.length > 2) {
            // Create select options to filter table by declared package licenses
            if (packagesDeclaredLicenses.length > 1) {
                packagesDeclaredLicenses.map(license => { 
                    packagesDeclaredLicensesFilter.push({
                        'text': license,
                        'value': license,
                    });
        
                    return {};
                })
            }

            // Create select options to filter table by detected package licenses
            if (packagesDetectedLicenses.length > 1) {
                packagesDetectedLicenses.map(license => { 
                    packagesDetectedLicensesFilter.push({
                        'text': license,
                        'value': license,
                    });
        
                    return {};
                })
            }

            // Create select options to filter table by detected package levels
            if (packagesLevels.length > 1) {
                for (let i = 0; i < packagesLevels.length; i++) {
                    packagesLevelsFilter.push({
                        'text': packagesLevels[i],
                        'value': packagesLevels[i],
                    });
                }
            }

            // Create select options to filter table by package status
            statusFilter.push(
                { 'text': 'Errors', 'value': 'errors'},
                { 'text': 'OK', 'value': 'ok'},
                { 'text': 'Updates', 'value': 'updates'},
                { 'text': 'Warnings', 'value': 'warnings'}
            );
        }

        // Specifies table columns as per
        // https://ant.design/components/table/
        this.columns = [
            {
                title: 'Id', 
                dataIndex: 'id', 
                key: 'id',
                align: 'left',
                render: (text, row, index) => {
                    return <span className="ort-package-id">{text}</span>;
                },
                onFilter: (value, record) => record.id.indexOf(value) === 0,
                sorter: (a, b) => a.id.length - b.id.length,
            },
            {
                title: 'Scopes',
                dataIndex: 'scopes',
                align: 'left',
                render: (text, row, index) => {
                    const listItems = row.scopes.map((scope) =>
                        <li key={scope}>{scope}</li>
                    );

                    return (<ul className="ort-table-list">{listItems}</ul>);
                },
                key: 'scopes'
            },
            {
                title: 'Levels',
                dataIndex: 'levels',
                align: 'left',
                filters: (function () { return packagesLevelsFilter })(),
                onFilter: (level, component) => component.levels.includes(parseInt(level, 10)),
                filterMultiple: true,
                render: (text, row, index) => {
                    const listItems = row.levels.map((level) =>
                        <li key={level}>{level}</li>
                    );

                    return (<ul className="ort-table-list">{listItems}</ul>);
                },
                key: 'levels'
            },
            {
                title: 'Declared Licenses',
                dataIndex: 'declaredLicenses',
                align: 'left',
                filters: (function () { return packagesDeclaredLicensesFilter })(),
                filterMultiple: true,
                render: (text, row, index) => {
                    const listItems = row.declaredLicenses.map((license) =>
                        <li key={license}><LicenseTag text={license}/></li>
                    );

                    return (<ul className="ort-table-list">{listItems}</ul>);
                },
                key: 'declaredLicenses',
                onFilter: (value, record) => record.declaredLicenses.includes(value)
            },
            {
                title: 'Detected Licenses',
                dataIndex: 'detectedLicenses',
                align: 'left',
                filters: (function () { return packagesDetectedLicensesFilter })(),
                onFilter: (license, component) => component.detectedLicenses.includes(license),
                filterMultiple: true,
                render: (text, row, index) => {
                    const listItems = row.detectedLicenses.map((license) =>
                        <li key={license}><LicenseTag text={license}/></li>
                    );

                    return (<ul className="ort-table-list">{listItems}</ul>);
                },
                key: 'detectedLicenses'
            },
            {
                title: 'Status',
                align: 'left',
                filters: (function () { return statusFilter })(),
                onFilter: (status, component) =>
                    status === 'ok'
                        ? componentOk(component)
                        : status === 'errors'
                        ? !componentOk(component)
                        : false,
                filterMultiple: true,
                render: (text, row, index) => {
                    // FIXME Remove quick hack to show 'Status' and
                    // switch to using report data
                
                    let errorText = '';

                    if (componentOk(row)) {
                     return <Tag className="ort-status-ok" color="blue">OK</Tag>
                    } else {
                        errorText = row.errors.total + ' error';

                        if (row.errors.total > 1) {
                            errorText = errorText + 's';
                        }
                    
                        return <Tag className="ort-status-error" color="red">{errorText}</Tag>;
                    }
                },
                key: 'status'
            }
        ];
    }

    render() {
        let props = this.props;

        if (!props.data && !props.project) {
            return (
                <div className="ort-package-info-error">
                    <Alert
                        message="Oops, something went wrong. Missing data to be able to create ProjectTable" 
                        type="error"
                        showIcon/>
                </div>
            );
        }

        return (
            <Table
                columns={this.columns}
                expandedRowRender={record => {
                    let className = "ort-package-expand", 
                        props = this.props,
                        packageId = record.id,
                        packageMetaData;

                    if (props.data.packagesMetaInfo && props.data.packagesMetaInfo[packageId]) {
                        packageMetaData = props.data.packagesMetaInfo[packageId];
                    }

                    if (record.errors && record.errors.total !== 0) {
                        className += "-error"; 
                    }

                    return (
                        <div className={className}>
                            <PackageInfo packageData={record} packageMetaData={packageMetaData}/>
                        </div>
                        )
                }}
                dataSource={this.packages}
                pagination={false}
                size='small'/>
        );
    }
}

// Generates the HTML to display the path(s) from root package to current package
// in an expanded row of projectTable
const PackageDependencyPaths = (props) => {
    let dependencyPaths = props.dependencyPaths,
        stepItems = (steps) => {
            return steps.map((item) =>
                <Step key={item} title={item}/>
            );
        },
        dependencyPathsTitle;

    if (dependencyPaths && dependencyPaths.length > 0 && dependencyPaths[0].length > 1) {
        dependencyPathsTitle = (() => {
            if (dependencyPaths.length === 1) {
                return (<h4>Dependency Path</h4>);
            } else {
                return (<h4>Dependency Paths ({dependencyPaths.length})</h4>);
            }
        })();
        
        return (
            <div className="ort-package-deps-paths">
                {dependencyPathsTitle}
                <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
                    itemLayout="vertical"
                    size="small"
                    pagination={{
                        hideOnSinglePage: true,
                        pageSize: 2,
                        size: "small"
                    }}
                    dataSource={dependencyPaths}
                    renderItem={item => (
                        <List.Item>
                            <Steps progressDot direction="vertical" size="small" current={item.length}>
                                {stepItems(item)}
                            </Steps>
                        </List.Item>
                    )}
                />
            </div>
        );
    }

    return (
        <div className="ort-package-deps-paths"></div>
    );
}

// Generates the HTML for packages errors in an expanded row of projectTable
const PackageErrors = function (props) {
    var analyzerPackageErrors,
        analyzerUlElement,
        listElements,
        packageErrors,
        scannerPackageErrors,
        scannerUlElement;

    if (props.errors) {
        packageErrors = props.errors;
        
        if (packageErrors && packageErrors.analyzer) {
            analyzerPackageErrors = packageErrors.analyzer;
            listElements = analyzerPackageErrors.map(
                function (text) {
                    return <Alert message={text} type="error" key={text} showIcon/>;
                }
            );

            analyzerUlElement = React.createElement('span', {className: 'ort-analyzer-errors'}, listElements);
        }

        if (packageErrors && packageErrors.scanner) {
            scannerPackageErrors = packageErrors.scanner;
            listElements = scannerPackageErrors.map(
                function (text) {
                    return <Alert message={text} type="error" key={text} showIcon/>;
                }
            );
            
            scannerUlElement = React.createElement('span', {className: 'ort-analyzer-errors'}, listElements);
        }

        return (
            <div className="ort-package-errors">
                {analyzerPackageErrors.length > 0 && <h4>Analyzer Errors</h4>}
                {analyzerUlElement}
                {scannerPackageErrors.length > 0 && <h4>Scanner Errors</h4>}
                {scannerUlElement}
            </div>
        );
    } else {
        return (
            <div className="package-errors"></div>
        );
    }
}

// Generates the HTML for the additional package information in an expanded row of projectTable
const PackageInfo = function (props) {
    if (!props.packageData || !props.packageMetaData) {
        return (
            <div className="ort-package-info-error">
                <Alert
                    message="Oops, something went wrong. Unable to retrieve information for this package." 
                    type="error"
                    showIcon/>
            </div>
        );
    }

    var packageData = props.packageData,
        packageMetadata = props.packageMetaData,
        packageDescription = "No package description available";
    
    if (packageMetadata) {
        if (packageMetadata.description) {
            packageDescription = packageMetadata.description;
        }
    }
    return (
        <div className="package-info">
            <p className="package-description">{packageDescription}</p>
            <PackageDependencyPaths dependencyPaths={packageData.dependencyPaths}/>
            <PackageErrors errors={packageData.errors}/>
        </div>
    );
}
*/