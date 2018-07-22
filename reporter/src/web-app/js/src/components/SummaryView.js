import React from 'react';
import { connect } from 'react-redux';
import { Alert, Col, Icon, Row, Table, Tabs, Timeline } from 'antd';
import { LicenseChart } from './LicenseChart';
import { UNIQUE_COLORS } from '../data/colors/index';

const COLORS = UNIQUE_COLORS.data;
const TabPane = Tabs.TabPane;

class SummaryView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
        this.licenseColors = new Map();

        const assignColorsToLicenses = (licenses) => {
            const nrColors = COLORS.length;

            for (let i = licenses.length - 1; i >= 0 ; i--) {
                let license = licenses[i];
                if (!this.licenseColors.has(license)) {
                    this.licenseColors.set(license, COLORS[this.licenseColors.size % nrColors]);
                }
            }
        },
        viewData = {
            charts: {
                declaredLicenses: [],
                detectedLicenses: [],
                totalDeclaredLicenses: 0,
                totalDetectedLicenses: 0
            },
            errors: {
                open: [],
                resolved: [],
                totalOpen: 0,
                totalResolved: 0
            }
        };

        if (props.reportData) {
            this.state = {
                ...this.state,
                data: props.reportData
            };

            if (this.state.data.licenses && this.state.data.licenses.data && this.state.data.licenses.total) {
                if (this.state.data.licenses.data.detected && 
                    this.state.data.licenses.total.hasOwnProperty('detected')) {
                    assignColorsToLicenses(Object.keys(this.state.data.licenses.data.detected));
                    viewData.charts.detectedLicenses = this.convertLicensesToChartFormat(this.state.data.licenses.data.detected);
                    viewData.charts.totalDetectedLicenses = this.state.data.licenses.total.detected;
                }

                if (this.state.data.licenses.data.declared && 
                    this.state.data.licenses.total.hasOwnProperty('declared')) {
                    assignColorsToLicenses(Object.keys(this.state.data.licenses.data.declared));
                    viewData.charts.declaredLicenses = this.convertLicensesToChartFormat(this.state.data.licenses.data.declared);
                    viewData.charts.totalDeclaredLicenses = this.state.data.licenses.total.declared;
                }
            }

            if (this.state.data.errors && this.state.data.errors.data && this.state.data.errors.total) {
                if (this.state.data.errors.data.open && this.state.data.errors.total.hasOwnProperty('open')) {
                    viewData.errors.open = this.convertErrorsToTableFormat(this.state.data.errors.data.open);
                    viewData.errors.totalOpen = this.state.data.errors.total.open;
                }

                if (this.state.data.errors.data.resolved && this.state.data.errors.total.hasOwnProperty('resolved')) {
                    viewData.errors.resolved = this.convertErrorsToTableFormat(this.state.data.errors.data.resolved);
                    viewData.errors.totalResolved = this.state.data.errors.total.resolved;
                }
            }
        }

        this.state = {
            ...this.state,
            viewData
        }
    
        console.log("this.state", this.state);
    }

    convertErrorsToTableFormat(errors) {
        return Object.values(errors).reduce((accumulator, error) => {
            return [...accumulator, ...error];
        }, []);
    }

    convertLicensesToChartFormat(licenses) {
        const chartData = Object.entries(licenses).reduce((accumulator, [key, value]) => {
            accumulator[key] = {
                name: key,
                value: value,
                color: this.licenseColors.get(key)
            };

            return accumulator;
        }, {});

        return Object.keys(chartData).sort().reduce((accumulator, key) => {
            accumulator.push(chartData[key]);

            return accumulator;
        }, []).reverse();
    }

    render() {
        const { data, viewData } = this.state,
            nrDetectedLicenses = viewData.charts.totalDetectedLicenses,
            nrDeclaredLicenses =  viewData.charts.totalDeclaredLicenses,
            nrErrors = viewData.errors.totalOpen,
            SummaryErrors = () => {
                const renderErrorTable = (data, pageSize) =>
                    <Table 
                        columns={[{
                            title: 'id',
                            dataIndex: 'id',
                            render: (text, row, index) => {
                                return (
                                    <div>
                                        <dl>
                                            <dt>{row.package ? row.package.id : row.id}</dt>
                                            <dd>Dependency defined in {row.file}</dd>
                                        </dl>
                                        <dl>
                                            <dd>{row.message}</dd>
                                        </dl>
                                    </div>
                                );
                            }
                        }]}
                        dataSource={data}
                        locale={{
                            emptyText: 'No errors'
                        }}
                        pagination={{
                            hideOnSinglePage: true,
                            pageSize: pageSize,
                        }}
                        rowKey='code'
                        scroll={{
                            y: 300
                        }}
                        showHeader={false}/>

                if (viewData.errors.totalOpen !== 0) {
                    return (
                        <Tabs tabPosition="top">
                            <TabPane tab={<span>Errors ({viewData.errors.totalOpen})</span>} key="1">
                                {renderErrorTable(viewData.errors.open, viewData.errors.totalOpen)}
                            </TabPane>
                            <TabPane tab={<span>Resolved Errors ({viewData.errors.totalResolved})</span>} key="2">
                                {renderErrorTable(viewData.errors.resolved, viewData.errors.totalResolved)}
                            </TabPane>
                        </Tabs>
                    );
                }

                // If return empty span to prevent React render error
                return (<span/>);
            },
            SummaryLicenseCharts = () => {
                const renderDetectedLicenseTab = () => {
                    if (nrDeclaredLicenses !== 0) {
                        return (
                            <TabPane tab={<span>Detected licenses ({nrDetectedLicenses})</span>} key="1">
                                <LicenseChart
                                    label="Detected licenses"
                                    licenses={viewData.charts.detectedLicenses}
                                    width={800}
                                    height={500}
                                />
                            </TabPane>
                        )
                    }

                    // If return empty span to prevent React render error
                    return;
                };

                return (
                    <Tabs tabPosition="top">
                        {renderDetectedLicenseTab()}
                        <TabPane tab={<span>Declared licenses ({nrDeclaredLicenses})</span>} key="2">
                            <LicenseChart
                                label="Declared licenses"
                                licenses={viewData.charts.declaredLicenses}
                                width={800}
                                height={500}
                            />
                        </TabPane>
                    </Tabs>
                )
            },
            SummaryTimeline = () => {
                let nrLevels = data.levels.total || 'n/a',
                    nrPackages = data.packages.total || 'n/a',
                    nrProjects = data.projects.total || 'n/a',
                    nrScopes = data.scopes.total || 'n/a',
                    renderLicensesText = function() {
                        if (nrDetectedLicenses === 0) {
                            return (<span>Detected <b>{nrDeclaredLicenses}</b> declared licenses</span>);
                        }
                        return (<span>Detected <b>{nrDetectedLicenses}</b> licenses and <b>{nrDeclaredLicenses}</b> declared licenses</span>);
                    },
                    renderCompletedText = () => {
                        if (nrErrors !== 0) {
                            return (<span style={{"color" : "#f5222d", "fontSize": "18px", "lineHeight": "1.2"}}><b>Completed scan with {nrErrors} errors </b></span>);
                        }

                        return (<span style={{"color" : "#52c41a", "fontSize": "18px", "lineHeight": "1.2"}}><b>Completed scan</b></span>);
                    },
                    vcs;
                
                if (data && data.vcs && data.vcs_processed) {
                    vcs = {
                        type: (data.vcs_processed.type || data.vcs.type || 'n/a'),
                        revision: (data.vcs_processed.revision || data.vcs.revision || 'n/a'),
                        url: (data.vcs_processed.url || data.vcs.url || 'n/a')
                    }

                    return (
                        <Timeline>
                            <Timeline.Item>Cloned revision <b>{vcs.revision}</b> of {vcs.type} repository <b>{vcs.url}</b> </Timeline.Item>
                            <Timeline.Item>Found <b>{nrProjects}</b> files defining <b>{nrPackages}</b> unique dependencies within <b>{nrScopes}</b> scopes and <b>{nrLevels}</b> dependency levels</Timeline.Item>
                            <Timeline.Item>{renderLicensesText()}</Timeline.Item>
                            <Timeline.Item dot={<Icon type={(nrErrors !== 0) ? 'exclamation-circle-o' : 'check-circle-o'} style={{ fontSize: '16px' }}/>} 
                                color={(nrErrors !== 0) ? 'red' : 'green'}>
                                {renderCompletedText()}
                            </Timeline.Item>
                        </Timeline>
                   );
                }

                return (<Alert message="No repository information available" type="error"/>);
            };

        return (
            <div className="ort-summary">
                <Row>
                    <Col span={22} offset={1}>
                        <SummaryTimeline/>
                    </Col>
                </Row>
                <Row>
                    <Col span={22} offset={1}>
                        <SummaryErrors/>
                    </Col>
                </Row>
                <Row>
                    <Col span={22} offset={1}>
                        <SummaryLicenseCharts/>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default connect(
    (state) => ({reportData: state}),
    () => ({})
)(SummaryView); 