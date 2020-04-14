import { IPerStateTestReport, IUsCasesTestingProgression } from './model/ICOVID19'
import csvParser, * as parser from 'csv-parser'
import { Readable } from 'stream'
import * as cron from 'cron'
import * as fetch from 'node-fetch'
import { DataReport, ReportDataPoint, ArchiveHttp } from 'ants-protocol-sdk'
import { TransactionAnnounceResponse, Account, NetworkType } from 'symbol-sdk'

export class CovidReportingBot {

    private trackerBaseUrl = 'https://covidtracking.com/api'
    private archiveHttp: ArchiveHttp
    private account: Account

    constructor(
        nodeUrl: string,
        apiKey: string
    ) {
        this.archiveHttp = new ArchiveHttp(nodeUrl)
        this.account = Account.createFromPrivateKey(apiKey, NetworkType.TEST_NET)
    }

    public start() {
        const night = '59 23 * * *'
        const minute = '* * * * * *'
        cron.job({
            cronTime: night, onTick: () => {
                this.fetchAndSendAllData().then((response) => console.log(response))
            }
        }).start()
    }

    private filterNullFromNumber(val: any, param: string): number {
        return val[`${param}`] != null ? val[`${param}`] : 0
    }

    private filterNullFromString(val: any, param: string): string {
        return val[`${param}`] != null ? val[`${param}`] : "none"
    }

    private fetchAndSendAllData(): Promise<TransactionAnnounceResponse> {
        let datapoints: ReportDataPoint[] = []
        let perState: IPerStateTestReport[] = []

        let endpoints = ['/v1/states/info.json', '/v1/states/current.json', '/us']
        return Promise.all(endpoints.map((endpoint) =>
            fetch.default(this.trackerBaseUrl + endpoint)
                .then((response) => response.json())
                .then((json) => json)
        )
        ).then((allData) => {
            (allData[1] as any[]).forEach((data: any) => {
                const pending = this.filterNullFromNumber(data, "pending")
                const inIcuCurrently = this.filterNullFromNumber(data, "inIcuCurrently")
                const inIcuCumulative = this.filterNullFromNumber(data, "inIcuCumulative")
                const grade = this.filterNullFromString(data, "grade")
                const onVentilatorCumulative = this.filterNullFromNumber(data, "onVentilatorCumulative")
                const onVentilatorCurrently = this.filterNullFromNumber(data, "onVentilatorCurrently")
                const recovered = this.filterNullFromNumber(data, "recovered")
                const hospitalized = this.filterNullFromNumber(data, "hospitalized")
                const death = this.filterNullFromNumber(data, "death")

                perState.push(
                    {
                        state: data.state,
                        positive: data.positive,
                        negative: data.negative,
                        pending: pending,
                        grade: grade,
                        inIcuCurrently: inIcuCurrently,
                        inIcuCumulative: inIcuCumulative,
                        onVentilatorCurrently: onVentilatorCurrently,
                        onVentilatorCumulative: onVentilatorCumulative,
                        recovered: recovered,
                        lastUpdate: data.lastUpdateEt,
                        death: death,
                        hospitalized: hospitalized,
                        totalTestResults: data.totalTestResults,
                        dateModified: data.dateModified,
                        dateChecked: data.dateChecked,
                        sourceForState: (allData[0] as any[]).find((item) => item.state === data.state).covid19Site,
                    }
                )

            })

            delete allData[2][0].notes
            datapoints.push(
                ReportDataPoint
                    .fromInterfaceToDataPoint('usOverallTestingProgression', allData[2][0], false))

            datapoints.push(
                ReportDataPoint.fromInterfaceToDataPoint('perStateReport', perState, true)
            )

            const report = new DataReport('uscovid', 'https://covidtracking.com', datapoints)

            return this.archiveHttp.announceDataThatFollowsSchema(
                this.account,
                report,
                'uscovid',
                'covidtrackertest').toPromise()
        })
    }
}