import type { SupplyChainTool } from '../types'

// Supply Chain Tools Definition (NetSuite-friendly)
export const SUPPLY_CHAIN_TOOLS: SupplyChainTool[] = [
  {
    id: 'order-tracker',
    name: 'Order Status Tracker',
    icon: 'Package',
    description: 'Track orders across multiple saved searches to see what has been ordered, shipped, and received.',
    howToUse: 'Upload your PO search exports, SO search exports, and Item Receipt exports. The tool will match by PO Number or SO Number to show the complete lifecycle.',
    requiredColumns: ['Internal ID', 'Document Number', 'Status']
  },
  {
    id: 'shipment-reconciler',
    name: 'Shipment Reconciler',
    icon: 'Truck',
    description: 'Compare expected shipments against actual receipts to identify discrepancies.',
    howToUse: 'Upload Item Fulfillment and Item Receipt exports. The tool matches by Item and compares quantities to find variances.',
    requiredColumns: ['Item', 'Quantity', 'Date']
  },
  {
    id: 'inventory-variance',
    name: 'Inventory Variance',
    icon: 'Box',
    description: 'Compare inventory counts across different time periods or locations.',
    howToUse: 'Upload inventory snapshots from different dates or locations. The tool calculates variances and highlights significant differences.',
    requiredColumns: ['Item', 'Location', 'Quantity On Hand']
  },
  {
    id: 'po-so-matcher',
    name: 'PO/SO Cross-Reference',
    icon: 'GitCompare',
    description: 'Match Purchase Orders to Sales Orders to track demand fulfillment.',
    howToUse: 'Upload PO and SO exports. The tool links them by Item to show coverage and gaps.',
    requiredColumns: ['Item', 'Quantity', 'Document Number']
  },
  {
    id: 'receipt-consolidator',
    name: 'Receipt Consolidator',
    icon: 'ClipboardList',
    description: 'Consolidate multiple receipt exports to get a complete picture of received goods.',
    howToUse: 'Upload multiple Item Receipt exports. The tool combines them and provides totals by Item, Vendor, or time period.',
    requiredColumns: ['Item', 'Quantity', 'Date']
  },
  {
    id: 'lead-time-analyzer',
    name: 'Lead Time Analyzer',
    icon: 'Calculator',
    description: 'Calculate actual lead times by comparing PO dates to receipt dates.',
    howToUse: 'Upload PO and Item Receipt exports. The tool calculates days between order and receipt for each item.',
    requiredColumns: ['Item', 'Date', 'Document Number']
  }
]
