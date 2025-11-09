declare module 'datatables.net' {
  interface Settings {
    use(type: 'lib' | 'win' | 'datetime' | 'luxon' | 'moment'): any;
    use(library: any): any;
    use(type: 'lib' | 'win' | 'datetime' | 'luxon' | 'moment', library: any): any;
  }
}