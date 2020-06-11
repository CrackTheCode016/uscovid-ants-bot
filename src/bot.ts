import { IPerStateTestReport, IUsCasesTestingProgression } from './model/ICOVID19'
import csvParser, * as parser from 'csv-parser'
import { Readable } from 'stream'
import * as cron from 'cron'
import * as fetch from 'node-fetch'
import { DataReport, ReportDataPoint, ArchiveHttp, ReportHttp } from 'ants-protocol-sdk'
import { TransactionAnnounceResponse, Account, NetworkType, RepositoryFactoryHttp } from 'symbol-sdk'
import { Observable } from 'rxjs'

export class CovidReportingBot {

    private trackerBaseUrl = 'https://covidtracking.com/api'
    private reportHttp: ReportHttp
    private account: Account

    constructor(
        nodeUrl: string,
        apiKey: string
    ) {
        const repositoryFactory = new RepositoryFactoryHttp(nodeUrl)
        this.reportHttp = new ReportHttp(repositoryFactory)
        this.account = Account.createFromPrivateKey(apiKey, NetworkType.TEST_NET)
    }

    public start() {
        const night = '59 23 * * *'
        const minute = '* * * * * *'
        cron.job({
            cronTime: minute, onTick: () => {
                this.fetchAndSendAllData().then((response) => console.log(response)).catch((e) => console.log("error", e))
            }
        }).start()
    }

    private fetchAndSendAllData(): Promise<TransactionAnnounceResponse> {
        return fetch.default(this.trackerBaseUrl + '/us')
            .then((response) => response.json())
            .then((json) => json)
            .then((allData) => {
                const jsonData = allData[0] as IUsCasesTestingProgression
                console.log(jsonData)
                const reporter = Account.createFromPrivateKey('FE2F226C0F03C4AFAD91C8AE379159259E3CED5C35A301FA90F31E45F65A6CC9', NetworkType.TEST_NET)
                const report = new DataReport(
                    'uscovid',
                    'https://covidtracking.com',
                    [ReportDataPoint.fromInterfaceToDataPoint<IUsCasesTestingProgression>('usOverallTestingProgression', jsonData, false)])


                return this.reportHttp.announceReportToArchive(
                    reporter,
                    report,
                    'uscovid',
                    'covidtrackertest').toPromise()
            })
    }
}
