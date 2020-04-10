import { IPerStateTestReport, IUsCasesTestingProgression } from './model/ICOVID19'
import csvParser, * as parser from 'csv-parser'
import { Readable } from 'stream'
import * as cron from 'cron'
import * as fetch from 'node-fetch'
import { DataReport, ReportDataPoint, ArchiveHttp } from 'symbol-archive-sdk'
import { TransactionAnnounceResponse, Account, NetworkType } from 'symbol-sdk'

export class CovidReportingBot {

    private trackerBaseUrl = 'https://covidtracking.com/api'
    private archiveHttp: ArchiveHttp
    private account: Account

    private formatMonth = (date: Date) => {
        const month = (date.getMonth() + 1).toString()
        return month.charAt(0) == '1' ? month.toString() : `0${month.toString()}`
    }
    private formatDay = (date: Date) => {
        const day = (date.getDate()).toString()
        return parseInt(day.charAt(0)) > 10 ? day.toString() : `0${day.toString()}`
    }

    constructor(
        nodeUrl: string,
        apiKey: string
    ) {
        this.archiveHttp = new ArchiveHttp(nodeUrl)
        this.account = Account.createFromPrivateKey(apiKey, NetworkType.TEST_NET)
    }

    public start() {
        this.fetchAndSendAllData()
        const night = '59 23 * * *'
        const minute = '* * * * *'
        cron.job({
            cronTime: night, onTick: () => {
                const date = new Date()
                const calculateDateFormatted: string = `${this.formatMonth(date)}-${this.formatDay(date)}-${date.getFullYear()}.csv`
                console.log(calculateDateFormatted)
                const url = this.trackerBaseUrl + calculateDateFormatted

            }
        }).start()
    }
    private fetchAndSendAllData(): Promise<TransactionAnnounceResponse> {
        let datapoints: ReportDataPoint[] = []
        let dailyUsData: IUsCasesTestingProgression

        let endpoints = ['/v1/states/info.json', '/v1/states/current.json', '/us']
        return Promise.all(endpoints.map((endpoint) =>
            fetch.default(this.trackerBaseUrl + endpoint)
                .then((response) => response.json())
                .then((json) => json)
        )
        ).then((allData) => {
            (allData[1] as any[]).forEach((data: any) => {
                datapoints.push(
                    ReportDataPoint.fromInterfaceToDataPoint<IPerStateTestReport>('perStateReport', {
                        state: data.state,
                        positive: data.positive,
                        negative: data.negative,
                        pending: data.pending,
                        grade: data.grade,
                        inIcuCumulative: data.inIcuCumulative,
                        inIcuCurrently: data.inIcuCurrently,
                        onVentilatorCumulative: data.onVentilatorCumulative,
                        onVentilatorCurrently: data.onVentilatorCurrently,
                        recovered: data.recovered,
                        lastUpdate: data.lastUpdateEt,
                        death: data.death,
                        hospitalized: data.hospitalized,
                        totalTestResults: data.totalTestResults,
                        dateModified: data.dateModified,
                        dateChecked: data.dateChecked,
                        sourceForState: (allData[0] as any[]).find((item) => item.state === data.state).covid19Site,
                    }))
            })

            delete allData[2][0].notes

            datapoints.push(
                ReportDataPoint
                    .fromInterfaceToDataPoint<IUsCasesTestingProgression>('usOverallTestingProgression', allData[2][0]))

            const report = new DataReport('uscovid', 'https://covidtracking.com', datapoints)

            return this.archiveHttp.announceDataThatFollowsSchema(
                this.account,
                report,
                'uscovid',
                'covidtrackertest').toPromise()
        })
    }
}